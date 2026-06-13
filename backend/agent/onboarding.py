"""Onboarding completion marker.

Option-1 completion bar: a member is "onboarded" once they reach the finish
screen, regardless of which screens they skipped (every screen is skippable by
design). We persist that as a tiny per-member marker file rather than threading
it through the provenance/authority writer system — finishing setup is a UI
meta-flag, not a financial fact with conflict semantics.

The chat reads `is_complete` to decide whether to softly nudge the active
member toward the onboarding page.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

_MARKER_NAME = "onboarding.md"
_COMPLETE_LINE = "status: complete"


def _marker_path(memory_root: Path, member: str) -> Path:
    return memory_root / "members" / member / _MARKER_NAME


def is_complete(memory_root: Path, member: str) -> bool:
    """True once the member has finished onboarding. False if the marker is
    absent (never onboarded)."""
    path = _marker_path(memory_root, member)
    if not path.is_file():
        return False
    return _COMPLETE_LINE in path.read_text(encoding="utf-8")


def mark_complete(memory_root: Path, member: str, today: date | None = None) -> None:
    """Record that the member reached the onboarding finish screen. Idempotent:
    re-marking just rewrites the same marker. The caller is responsible for
    validating `member` and ensuring the member dir exists."""
    day = today or date.today()
    path = _marker_path(memory_root, member)
    path.write_text(
        f"# Onboarding\n\n{_COMPLETE_LINE}\ncompleted_at: {day.isoformat()}\n",
        encoding="utf-8",
    )
