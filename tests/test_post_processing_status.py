"""
Tests for the post-processing status redesign.

What changed vs. the old `.closed` marker:
- Post-processing status now lives IN the JSONL transcript as a terminal event
  (`{"type": "post_processing", "status": "completed", ...}`) — single source of
  truth, no sibling marker file.
- Entity writers are idempotent via a `dedup_id`, so re-running a close never
  duplicates entities that already landed.
- The completion event is stamped ONLY on a fully-clean dispatch. A partial
  failure leaves the session un-stamped so the catch-up scan retries it; the
  idempotent writers absorb the re-run.
- Malformed entries are dropped at validation (not counted as failures) so a
  structurally-bad entry can never wedge the session into infinite retry.

TDD: written FIRST (RED), implementation makes them GREEN. Conventions mirror
test_memory_updater.py / test_durability.py.
"""
from __future__ import annotations

import json

import pytest

from backend.agent import memory_updater, writers
from backend.agent.memory_updater import close_session
from backend.agent.transcripts import is_post_processed, transcript_path
from backend.config import settings


@pytest.fixture(autouse=True)
def reset_provider():
    memory_updater._provider = None
    yield
    memory_updater._provider = None


def _write_transcript(member: str, session_id: str, *, ts: str = "2026-06-06T10:00:00.000Z"):
    path = transcript_path(member, session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"ts": ts, "user_msg": "where to park 5L", "assistant_msg": "liquid fund"})
        + "\n"
    )
    return path


# ---------------------------------------------------------------------------
# Writer idempotency
# ---------------------------------------------------------------------------

# These exercise the generic append+dedup mechanism (_append_entry) via an
# append-only writer (write_recommendation); write_goal is now current-value.
def test_writer_dedup_skips_second_identical(tmp_memory):
    writers.write_recommendation(
        "vedant", title="Park surplus", priority=1, body="x", date="2026-06-06", dedup_id="abc123"
    )
    writers.write_recommendation(
        "vedant", title="Park surplus", priority=1, body="x", date="2026-06-06", dedup_id="abc123"
    )
    content = (tmp_memory / "members" / "vedant" / "recommendations.md").read_text()
    assert content.count("## Park surplus") == 1


def test_writer_without_dedup_id_always_appends(tmp_memory):
    writers.write_recommendation("vedant", title="Park surplus", priority=1, body="x", date="2026-06-06")
    writers.write_recommendation("vedant", title="Park surplus", priority=1, body="x", date="2026-06-06")
    content = (tmp_memory / "members" / "vedant" / "recommendations.md").read_text()
    assert content.count("## Park surplus") == 2


def test_writer_different_dedup_id_appends(tmp_memory):
    writers.write_recommendation(
        "vedant", title="Park surplus", priority=1, body="x", date="2026-06-06", dedup_id="id1"
    )
    writers.write_recommendation(
        "vedant", title="Park surplus", priority=2, body="y", date="2026-06-06", dedup_id="id2"
    )
    content = (tmp_memory / "members" / "vedant" / "recommendations.md").read_text()
    assert content.count("## Park surplus") == 2


# ---------------------------------------------------------------------------
# Status lives in the transcript, not a marker file
# ---------------------------------------------------------------------------

async def test_close_writes_completed_event_not_marker(tmp_memory, fake_provider):
    fake_provider.payload = {"summary_3_lines": ["a", "b"]}
    memory_updater._provider = fake_provider
    _write_transcript("vedant", "s1")

    await close_session("vedant", "s1")

    assert is_post_processed("vedant", "s1")
    assert not (settings.resolve(settings.sessions_dir) / "vedant" / "s1.closed").exists()


async def test_completed_session_is_noop(tmp_memory, fake_provider):
    fake_provider.payload = {"summary_3_lines": ["x"]}
    memory_updater._provider = fake_provider
    _write_transcript("vedant", "s2")

    await close_session("vedant", "s2")
    await close_session("vedant", "s2")

    assert fake_provider.calls == 1
    conv = (tmp_memory / "members" / "vedant" / "conversations.md").read_text()
    assert conv.count("## ") == 1


async def test_no_transcript_is_noop(tmp_memory, fake_provider):
    memory_updater._provider = fake_provider

    await close_session("vedant", "ghost")

    assert fake_provider.calls == 0
    assert not is_post_processed("vedant", "ghost")
    assert not transcript_path("vedant", "ghost").exists()


# ---------------------------------------------------------------------------
# Partial failure → not completed → retriable, with no duplicates
# ---------------------------------------------------------------------------

async def test_partial_failure_does_not_complete(tmp_memory, fake_provider, monkeypatch):
    fake_provider.payload = {
        "summary_3_lines": ["s"],
        "new_recommendations": [{"title": "Rec A", "priority": 1, "assumptions": "x"}],
    }
    memory_updater._provider = fake_provider
    _write_transcript("vedant", "s3")

    def boom(*a, **k):
        raise OSError("disk full")

    monkeypatch.setattr(memory_updater, "write_recommendation", boom)

    await close_session("vedant", "s3")

    # Summary landed, recommendation failed → session NOT completed → retriable.
    assert not is_post_processed("vedant", "s3")
    conv = (tmp_memory / "members" / "vedant" / "conversations.md").read_text()
    assert "- s" in conv


async def test_retry_after_partial_failure_no_duplicates(tmp_memory, fake_provider, monkeypatch):
    fake_provider.payload = {
        "summary_3_lines": ["sumline"],
        "new_recommendations": [{"title": "Rec A", "priority": 1, "assumptions": "x"}],
    }
    memory_updater._provider = fake_provider
    _write_transcript("vedant", "s4")

    state = {"n": 0}
    real_rec = writers.write_recommendation

    def flaky(*a, **k):
        state["n"] += 1
        if state["n"] == 1:
            raise OSError("transient")
        return real_rec(*a, **k)

    monkeypatch.setattr(memory_updater, "write_recommendation", flaky)

    await close_session("vedant", "s4")  # rec fails → not completed
    assert not is_post_processed("vedant", "s4")

    await close_session("vedant", "s4")  # retry → rec succeeds → completed
    assert is_post_processed("vedant", "s4")

    conv = (tmp_memory / "members" / "vedant" / "conversations.md").read_text()
    rec = (tmp_memory / "members" / "vedant" / "recommendations.md").read_text()
    assert conv.count("## ") == 1  # summary not re-appended by the retry
    assert rec.count("## Rec A") == 1  # recommendation written exactly once
    assert fake_provider.calls == 2  # LLM re-called on retry


# ---------------------------------------------------------------------------
# Malformed entry is dropped at validation, never blocks completion
# ---------------------------------------------------------------------------

async def test_malformed_entry_skipped_still_completes(tmp_memory, fake_provider):
    fake_provider.payload = {
        "summary_3_lines": ["s"],
        "new_recommendations": [{"priority": 1}],  # missing required title
    }
    memory_updater._provider = fake_provider
    _write_transcript("vedant", "s5")

    await close_session("vedant", "s5")

    # Bad entry dropped (validation, not a failure) → session still completes.
    assert is_post_processed("vedant", "s5")
    assert not (tmp_memory / "members" / "vedant" / "recommendations.md").exists()
