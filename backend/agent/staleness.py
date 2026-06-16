"""Read-side staleness caveats (MEMORY_DATA_MODEL M2).

When the assembler loads a current-value file, a CURRENT block whose `as_of` is
well in the past gets an inline caveat injected right under its header, so the
advisor can see the figure may be outdated. This never mutates stored memory —
it only annotates the copy that goes into the prompt.

Pure and immutable: `annotate_stale_blocks` returns a new string and reads no
clock of its own (today is passed in), so it is trivially testable.
"""
from __future__ import annotations

import re
from datetime import date

# A quarter old: long enough that a stated income/expense/holding may have moved.
_STALE_THRESHOLD_DAYS = 90

_AS_OF_RE = re.compile(r"(?m)^- as_of: (\S+)\s*$")


def _split_blocks(content: str) -> list[str]:
    """Split at each `## ` header, keeping delimiters so a join is lossless.
    The first element may be preamble (not a block)."""
    return re.split(r"(?m)(?=^## )", content)


def _days_old(as_of: str, today: str) -> int | None:
    """Whole days between as_of and today, or None if either is not an ISO date."""
    try:
        return (date.fromisoformat(today) - date.fromisoformat(as_of)).days
    except ValueError:
        return None


def _annotate_block(block: str, today: str, threshold_days: int) -> str:
    # Only CURRENT current-value blocks carry a live figure worth flagging;
    # SUPERSEDED history and dated snapshots are left alone.
    if "- status: CURRENT" not in block:
        return block
    m = _AS_OF_RE.search(block)
    if not m:
        return block
    days = _days_old(m.group(1), today)
    if days is None or days <= threshold_days:
        return block
    header, sep, rest = block.partition("\n")
    if not sep:
        return block
    caveat = f"_(as of {m.group(1)}, about {days} days ago; may be outdated)_"
    return f"{header}\n{caveat}\n{rest}"


def annotate_stale_blocks(
    body: str, *, today: str, threshold_days: int = _STALE_THRESHOLD_DAYS
) -> str:
    """Return `body` with a staleness caveat under every CURRENT block whose
    as_of is older than `threshold_days`. Non-block preamble is untouched."""
    if not body:
        return body
    parts = _split_blocks(body)
    return "".join(
        _annotate_block(p, today, threshold_days) if p.startswith("## ") else p
        for p in parts
    )
