"""Staleness caveats (MEMORY_DATA_MODEL M2).

A CURRENT current-value block whose `as_of` is well in the past gets an inline
"as of X, about N days ago" caveat so the advisor can see the number may be
outdated. Only CURRENT blocks with a parseable as_of older than the threshold
are annotated; everything else is left untouched.
"""
from __future__ import annotations

from backend.agent.staleness import annotate_stale_blocks

TODAY = "2026-06-15"


def _block(key: str, as_of: str, status: str = "CURRENT") -> str:
    return (
        f"## {key}\n"
        f"- value: 100000\n"
        f"- source: conversation\n"
        f"- as_of: {as_of}\n"
        f"- status: {status}\n"
        f"<!-- id:{key} -->\n"
    )


def test_fresh_block_is_unchanged():
    body = _block("income.salary", "2026-06-01")  # 14 days old
    assert annotate_stale_blocks(body, today=TODAY) == body


def test_stale_current_block_gets_caveat():
    body = _block("income.salary", "2026-01-01")  # ~165 days old
    out = annotate_stale_blocks(body, today=TODAY)
    assert "2026-01-01" in out
    assert "165 days ago" in out
    # caveat sits right under the header, before the fields
    assert out.index("days ago") < out.index("- value:")


def test_superseded_block_not_annotated():
    body = _block("income.salary", "2026-01-01", status="SUPERSEDED")
    assert annotate_stale_blocks(body, today=TODAY) == body


def test_missing_as_of_is_safe():
    body = "## income.salary\n- value: 100000\n- status: CURRENT\n<!-- id:x -->\n"
    assert annotate_stale_blocks(body, today=TODAY) == body


def test_malformed_as_of_is_safe():
    body = _block("income.salary", "not-a-date")
    assert annotate_stale_blocks(body, today=TODAY) == body


def test_future_as_of_not_annotated():
    body = _block("income.salary", "2027-01-01")  # in the future
    assert annotate_stale_blocks(body, today=TODAY) == body


def test_only_stale_block_annotated_among_many():
    fresh = _block("income.salary", "2026-06-10")
    stale = _block("expense.rent", "2025-12-01")
    out = annotate_stale_blocks(fresh + "\n" + stale, today=TODAY)
    assert out.count("days ago") == 1
    # the fresh block's portion is unchanged
    assert "## income.salary\n- value:" in out


def test_empty_body_is_safe():
    assert annotate_stale_blocks("", today=TODAY) == ""
