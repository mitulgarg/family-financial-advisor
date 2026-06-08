"""
Per-file memory writers, guarded by cross-member write isolation.

This is the privacy enforcement point (PRD Decision #27): a writer acting as
member X may only write under `memory/members/X/` or the shared `memory/family/`
tree. `_assert_writable` runs FIRST in every public writer, so a summarizer that
hallucinates another member's path is rejected before any bytes are written.

Greppable invariant: this module never opens files directly — every write
routes through `markdown_io` helpers.

Idempotency: pass a `dedup_id` to make a write skip-if-already-present, so a
retried session close never duplicates entities that already landed.
"""
from __future__ import annotations

import logging
from pathlib import Path

from backend.config import settings
from backend.utils.markdown_io import append_markdown, read_markdown_or_none

logger = logging.getLogger(__name__)


class CrossMemberWriteError(Exception):
    """Raised when a writer attempts to write outside its own member tree or the
    shared family tree."""


def _assert_writable(writer: str, target: Path) -> None:
    root = settings.resolve(settings.memory_dir).resolve()
    allowed = (root / "members" / writer, root / "family")
    resolved = target.resolve()
    if not any(
        resolved == a or a in resolved.parents for a in (a.resolve() for a in allowed)
    ):
        raise CrossMemberWriteError(f"{writer} cannot write {resolved}")


def _member_file(writer: str, fname: str) -> Path:
    return settings.resolve(settings.memory_dir) / "members" / writer / fname


def _id_marker(dedup_id: str) -> str:
    return f"<!-- id:{dedup_id} -->"


def _append_entry(writer: str, path: Path, entry: str, dedup_id: str | None) -> None:
    """Write one entry, guarded by cross-member isolation.

    When `dedup_id` is given the entry is idempotent: if a marker for that id is
    already in the file the write is skipped, so re-running a session close never
    duplicates entities that already landed. The marker is embedded in the entry
    so it persists for the next check."""
    _assert_writable(writer, path)
    if dedup_id is None:
        append_markdown(path, entry)
        return
    marker = _id_marker(dedup_id)
    existing = read_markdown_or_none(path)
    if existing is not None and marker in existing:
        return
    append_markdown(path, f"\n{marker}{entry}")


def write_recommendation(
    writer: str,
    *,
    title: str,
    priority: int,
    body: str,
    date: str,
    dedup_id: str | None = None,
) -> None:
    """Append a PROPOSED recommendation to the writer's recommendations.md."""
    p = _member_file(writer, "recommendations.md")
    entry = (
        f"\n## {title}\n"
        f"- Date: {date}\n"
        f"- Priority: P{priority}\n"
        f"- Status: PROPOSED\n"
        f"- Assumptions_at_time: {body}\n"
    )
    _append_entry(writer, p, entry, dedup_id)


def write_goal(
    writer: str,
    *,
    title: str,
    target: str,
    horizon: str,
    date: str,
    dedup_id: str | None = None,
) -> None:
    """Append a goal to the writer's goals.md."""
    p = _member_file(writer, "goals.md")
    entry = (
        f"\n## {title}\n"
        f"- Date: {date}\n"
        f"- Target: {target}\n"
        f"- Horizon: {horizon}\n"
        f"- Status: ACTIVE\n"
    )
    _append_entry(writer, p, entry, dedup_id)


def write_life_event(
    writer: str, *, description: str, date: str, dedup_id: str | None = None
) -> None:
    """Append a stated life event to the writer's life_events.md."""
    p = _member_file(writer, "life_events.md")
    entry = f"\n- {date}: {description}\n"
    _append_entry(writer, p, entry, dedup_id)


def append_conversation_summary(
    writer: str, *, date: str, summary_lines: list[str], dedup_id: str | None = None
) -> None:
    """Append a dated block of summary lines to the writer's conversations.md."""
    p = _member_file(writer, "conversations.md")
    lines = "".join(f"- {line}\n" for line in summary_lines)
    entry = f"\n## {date}\n{lines}"
    _append_entry(writer, p, entry, dedup_id)


def record_status_transition(
    writer: str,
    *,
    item: str,
    from_status: str,
    to_status: str,
    date: str,
    dedup_id: str | None = None,
) -> None:
    """Append a recommendation/goal status transition to agent_notes.md."""
    p = _member_file(writer, "agent_notes.md")
    entry = f"\n- {date}: {item} — {from_status} → {to_status}\n"
    _append_entry(writer, p, entry, dedup_id)
