"""
Per-turn orchestration spine.

`run_chat_turn` owns the lifecycle: session resolve → assemble → stream →
history append → transcript write. `backend/main.py` is the only consumer and
maps the yielded TurnEvent union to the FROZEN SSE event shape.

The TurnEvent union below is frozen at end of Day 2 — pipeline never emits raw
SSE strings.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncIterator

from backend.agent import sessions, transcripts
from backend.agent.agent_loop import ToolPhaseBoundary, run_agent_loop
from backend.agent.assembler import AssemblyError, assemble
from backend.agent.classifier import classify
from backend.agent.llm_provider import (
    LLMProvider,
    StreamEnd,
    StreamError,
    TextDelta,
)
from backend.agent.tools.dispatch import default_dispatch
from backend.agent.transcripts import TranscriptRecord
from backend.config import settings
from backend.text_utils import to_bubbles

logger = logging.getLogger(__name__)

# One shared tool dispatch for the agent loop (read_context + future tools).
_DISPATCH = default_dispatch()


# --- TurnEvent union (FROZEN at end of Day 2) ---


@dataclass(frozen=True)
class TurnToken:
    text: str


@dataclass(frozen=True)
class TurnDone:
    session_id: str
    turn_id: str


@dataclass(frozen=True)
class TurnError:
    message: str


TurnEvent = TurnToken | TurnDone | TurnError


async def run_chat_turn(
    *,
    provider: LLMProvider,
    member: str,
    user_message: str,
    memory_root: Path,
    skills_root: Path,
    max_tokens: int,
) -> AsyncIterator[TurnEvent]:
    try:
        now = time.monotonic()
        active_sid, _ = sessions.resolve_session(member, now)
        sessions.touch(member, active_sid, now)
        snapshot = sessions.get_history(member, active_sid)

        classification = await classify(
            provider=provider,
            member=member,
            user_message=user_message,
            history=snapshot,
            session_id=active_sid,
        )

        try:
            prompt = assemble(
                active_member=member,
                classifier_output=classification.output,
                in_session_history=snapshot,
                user_message=user_message,
                memory_root=memory_root,
                skills_root=skills_root,
            )
        except AssemblyError as e:
            yield TurnError(str(e))
            return

        logger.info(
            "assembler: intent=%s level=%s loaded=%s missing=%s",
            classification.intent,
            prompt.context_level,
            prompt.debug.get("loaded", []),
            prompt.debug.get("missing", []),
        )

        tool_calls_log: list[dict] = []
        parts: list[str] = []
        reply_chunks: list[str] = []

        def _flush() -> str | None:
            # Sanitize the buffered beat through to_bubbles (em-dash strip +
            # blank-line bubbles), then return the SSE text to emit. A separator
            # is prefixed after the first chunk because the frontend concatenates
            # token events, so the new beat must start its own bubble group.
            chunk = "\n\n".join(to_bubbles("".join(parts)))
            parts.clear()
            if not chunk:
                return None
            prefix = "\n\n" if reply_chunks else ""
            reply_chunks.append(chunk)
            return prefix + chunk

        async for ev in run_agent_loop(
            provider=provider,
            prompt=prompt,
            dispatch=_DISPATCH,
            active_member=member,
            max_tokens=max_tokens,
            max_iterations=settings.max_tool_iterations,
            tool_calls_log=tool_calls_log,
        ):
            if isinstance(ev, TextDelta):
                # Buffer, don't stream raw: each beat passes through to_bubbles
                # before the user sees it. Flushed at a tool boundary and at end.
                parts.append(ev.text)
            elif isinstance(ev, ToolPhaseBoundary):
                # The model is about to look something up: flush its "let me
                # check on that" beat now so it reaches the user during the
                # lookup, then the answer arrives as a follow-up bubble.
                logger.info("pipeline: tool phase -> %s", ev.tool_names)
                emitted = _flush()
                if emitted:
                    yield TurnToken(emitted)
            elif isinstance(ev, StreamError):
                # Exponential-retry seam: wrap the loop above with backoff before
                # yielding TurnError. Mid-stream failure currently aborts the
                # turn — no history/transcript write.
                yield TurnError(ev.message)
                return
            elif isinstance(ev, StreamEnd):
                logger.info(
                    "llm: model=%s in=%d out=%d cache_r=%d cache_w=%d "
                    "latency_ms=%.0f cost_usd=%.6f stop=%s",
                    ev.model,
                    ev.input_tokens,
                    ev.output_tokens,
                    ev.cache_read_tokens,
                    ev.cache_write_tokens,
                    ev.latency_ms,
                    ev.cost_usd,
                    ev.stop_reason,
                )
                break

        emitted = _flush()
        if emitted:
            yield TurnToken(emitted)
        # Full reply for history/transcript: the bubbles the user saw, in order.
        assistant_msg = "\n\n".join(reply_chunks)

        turn_id = transcripts.turn_id_for(len(snapshot))

        sessions.append_history(member, active_sid, "user", user_message)
        sessions.append_history(member, active_sid, "assistant", assistant_msg)

        transcripts.append_turn(
            TranscriptRecord(
                ts=transcripts.now_iso(),
                member=member,
                session_id=active_sid,
                turn_id=turn_id,
                user_msg=user_message,
                assistant_msg=assistant_msg,
                tool_calls=tuple(tool_calls_log),
                intent=classification.intent,
            )
        )

        logger.info("turn complete: %s/%s/%s", member, active_sid, turn_id)
        yield TurnDone(active_sid, turn_id)

    except Exception as exc:
        logger.exception("run_chat_turn failed")
        yield TurnError(str(exc))
