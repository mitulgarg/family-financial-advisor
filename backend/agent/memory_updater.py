"""
Session-end summarizer — idempotent persistence of conversation outcomes.

`close_session` is the single convergence point for both close triggers (the
`/session/close` beacon and the 60s idle sweep / startup scan). It reads the
session JSONL transcript, asks the model to extract durable outcomes via a forced
`summarize` tool, and dispatches each to the matching writer with `writer=member`
(so cross-member isolation holds even if the model hallucinates another member).

Status lives in the transcript, not a marker file. The durable 'done' signal is a
terminal `post_processing` event appended LAST, only after EVERY entity persisted
successfully. If a write fails, no completion event is written, so the catch-up
scan retries; the entity writers are idempotent (dedup_id) so the retry never
duplicates what already landed. Malformed entries are dropped at validation —
they are not failures, so a structurally-bad entry can never wedge the session
into infinite retry.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import date

from backend.agent.llm_provider import LLMProvider, SystemBlock, get_provider
from backend.agent.transcripts import (
    is_post_processed,
    mark_post_processed,
    transcript_path,
)
from backend.agent.writers import (
    append_conversation_summary,
    record_status_transition,
    write_goal,
    write_life_event,
    write_recommendation,
)
from backend.config import settings
from backend.utils.markdown_io import read_markdown_or_none

logger = logging.getLogger(__name__)

_DEFAULT_PRIORITY = 2

_provider: LLMProvider | None = None


def _get_provider() -> LLMProvider:
    """Lazy module-level provider so close_session does not need one injected."""
    global _provider
    if _provider is None:
        _provider = get_provider()
    return _provider


_SUMMARIZER_SYSTEM = (
    "You are summarizing a closed advisory session for durable memory. Extract "
    "only what was actually established this session — do not invent. Produce a "
    "concise 3-line summary plus any new recommendations, goals, stated life "
    "events, and status changes that the family member and advisor agreed on."
)

_SUMMARIZE_TOOL = {
    "name": "summarize",
    "description": "Extract durable outcomes from the session transcript.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary_3_lines": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Up to 3 short lines summarizing the session.",
            },
            "new_recommendations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "priority": {"type": "integer", "enum": [1, 2, 3]},
                        "assumptions": {"type": "string"},
                    },
                    "required": ["title"],
                },
            },
            "new_goals": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "target": {"type": "string"},
                        "horizon": {"type": "string"},
                    },
                    "required": ["title"],
                },
            },
            "life_events_stated": {
                "type": "array",
                "items": {"type": "string"},
            },
            "status_transitions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "item": {"type": "string"},
                        "from_status": {"type": "string"},
                        "to_status": {"type": "string"},
                    },
                    "required": ["item", "from_status", "to_status"],
                },
            },
        },
        "required": ["summary_3_lines"],
    },
}


# Per-session async locks preventing TOCTOU on the check-summarize-mark body.
# Lazily created; keyed by (member, session_id).
_session_locks: dict[tuple[str, str], asyncio.Lock] = {}


def _lock_for(member: str, session_id: str) -> asyncio.Lock:
    # setdefault is atomic at the dict level, so concurrent callers for the same
    # session always get the same lock without a check-then-set race.
    return _session_locks.setdefault((member, session_id), asyncio.Lock())


def _dedup_id(session_id: str, *parts: str) -> str:
    """Stable, content-derived id for a single entity within a session.

    Keyed on session_id + the entity's semantic identity ONLY — never on the run
    time or run date, which vary across retries and would defeat dedup. Two
    retries of the same session's post-processing produce the same id for the
    same entity, so the idempotent writers skip the re-write."""
    raw = "|".join((session_id, *parts))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _run(label: str, fn) -> bool:
    """Run one writer dispatch. Returns True on success; on failure logs and
    returns False so the caller can withhold the completion stamp and retry.

    Only environmental write failures reach here — malformed entries are dropped
    at validation in `_dispatch` before a writer is ever called."""
    try:
        fn()
        return True
    except Exception:
        logger.exception("memory_updater: writer failed (%s)", label)
        return False


def _dispatch(member: str, session_id: str, raw: dict, today: str) -> bool:
    """Route summarizer output to the per-file writers. All writes use
    writer=member so isolation holds regardless of model output.

    Returns True only if every attempted write succeeded. Entries missing
    required fields are skipped (logged, not counted as failures) so a bad entry
    cannot block completion forever."""
    all_ok = True

    summary_lines = raw.get("summary_3_lines") or []
    if summary_lines:
        all_ok &= _run(
            "conversation_summary",
            lambda: append_conversation_summary(
                member,
                date=today,
                summary_lines=summary_lines,
                dedup_id=_dedup_id(session_id, "summary"),
            ),
        )

    for rec in raw.get("new_recommendations", []):
        title = rec.get("title")
        if not title:
            logger.warning("memory_updater: skipping recommendation with no title")
            continue
        all_ok &= _run(
            "recommendation",
            lambda rec=rec, title=title: write_recommendation(
                member,
                title=title,
                priority=rec.get("priority", _DEFAULT_PRIORITY),
                body=rec.get("assumptions", ""),
                date=today,
                dedup_id=_dedup_id(session_id, "rec", title),
            ),
        )

    for goal in raw.get("new_goals", []):
        title = goal.get("title")
        if not title:
            logger.warning("memory_updater: skipping goal with no title")
            continue
        all_ok &= _run(
            "goal",
            lambda goal=goal, title=title: write_goal(
                member,
                title=title,
                target=goal.get("target", ""),
                horizon=goal.get("horizon", ""),
                date=today,
                dedup_id=_dedup_id(session_id, "goal", title),
            ),
        )

    for event in raw.get("life_events_stated", []):
        if not isinstance(event, str) or not event.strip():
            logger.warning("memory_updater: skipping empty life event")
            continue
        all_ok &= _run(
            "life_event",
            lambda event=event: write_life_event(
                member,
                description=event,
                date=today,
                dedup_id=_dedup_id(session_id, "life_event", event),
            ),
        )

    for transition in raw.get("status_transitions", []):
        item = transition.get("item")
        from_status = transition.get("from_status")
        to_status = transition.get("to_status")
        if not (item and from_status and to_status):
            logger.warning("memory_updater: skipping incomplete status transition")
            continue
        all_ok &= _run(
            "status_transition",
            lambda item=item, from_status=from_status, to_status=to_status: record_status_transition(
                member,
                item=item,
                from_status=from_status,
                to_status=to_status,
                date=today,
                dedup_id=_dedup_id(session_id, "status", item, from_status, to_status),
            ),
        )

    return all_ok


async def close_session(member: str, session_id: str) -> None:
    """Summarize and persist a closed session. Idempotent via the transcript's
    terminal post-processing event.

    No-op if already post-processed or if there is no transcript (nothing to
    summarize, and nothing the catch-up scan could find). On a partial write
    failure no completion event is written, so the scan retries; the idempotent
    writers absorb the re-run.

    The per-session async lock closes the TOCTOU window: two concurrent callers
    (startup scan + idle sweep + beacon) both pass the initial status check
    before either writes, but only one proceeds through the summarizer. The
    completion event is written LAST so a crash mid-summarize leaves the session
    retryable."""
    async with _lock_for(member, session_id):
        if is_post_processed(member, session_id):
            logger.info("memory_updater: already post-processed %s/%s", member, session_id)
            return

        content = read_markdown_or_none(transcript_path(member, session_id))
        if content is None:
            logger.info(
                "memory_updater: no transcript %s/%s — nothing to process", member, session_id
            )
            return

        raw = await _get_provider().complete_json(
            system=[SystemBlock(text=_SUMMARIZER_SYSTEM)],
            messages=[{"role": "user", "content": content}],
            tool=_SUMMARIZE_TOOL,
            model=settings.summarizer_model,
            max_tokens=1024,
        )

        today = date.today().isoformat()
        all_ok = _dispatch(member, session_id, raw, today)

        if all_ok:
            mark_post_processed(member, session_id)
            logger.info("memory_updater: post-processed %s/%s", member, session_id)
        else:
            logger.warning(
                "memory_updater: post-processing incomplete %s/%s — will retry",
                member,
                session_id,
            )
