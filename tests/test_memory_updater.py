from __future__ import annotations

import pytest

from backend.agent import memory_updater
from backend.agent.memory_updater import close_session
from backend.agent.transcripts import is_post_processed, mark_post_processed, transcript_path


@pytest.fixture(autouse=True)
def reset_provider():
    memory_updater._provider = None
    yield
    memory_updater._provider = None


def _write_transcript(member: str, session_id: str) -> None:
    path = transcript_path(member, session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        '{"ts":"2026-06-06T10:00:00.000Z","user_msg":"where to park 5L","assistant_msg":"liquid fund"}\n'
    )


async def test_happy_path_writes_summary_and_recommendation(tmp_memory, fake_provider):
    fake_provider.payload = {
        "summary_3_lines": ["talked surplus", "park 5L", "liquid fund"],
        "new_recommendations": [
            {"title": "Park surplus", "priority": 1, "assumptions": "5L matured"}
        ],
    }
    memory_updater._provider = fake_provider
    _write_transcript("vedant", "sess1")

    await close_session("vedant", "sess1")

    conv = (tmp_memory / "members" / "vedant" / "conversations.md").read_text()
    rec = (tmp_memory / "members" / "vedant" / "recommendations.md").read_text()
    assert "park 5L" in conv
    assert "Status: PROPOSED" in rec
    assert is_post_processed("vedant", "sess1")
    assert fake_provider.calls == 1


async def test_already_processed_is_noop(tmp_memory, fake_provider):
    memory_updater._provider = fake_provider
    _write_transcript("vedant", "sess1")
    # Pre-stamp the completion event in the transcript.
    mark_post_processed("vedant", "sess1")

    await close_session("vedant", "sess1")

    # No model call, no files written.
    assert fake_provider.calls == 0
    assert not (tmp_memory / "members" / "vedant" / "conversations.md").exists()


async def test_no_transcript_is_noop(tmp_memory, fake_provider):
    memory_updater._provider = fake_provider
    # No transcript file written for this session.
    await close_session("vedant", "ghost")

    # Nothing to summarize → no model call, no status written, no phantom file.
    assert fake_provider.calls == 0
    assert not is_post_processed("vedant", "ghost")
    assert not transcript_path("vedant", "ghost").exists()


async def test_empty_response_completes_without_entries(tmp_memory, fake_provider):
    fake_provider.payload = {}
    memory_updater._provider = fake_provider
    _write_transcript("vedant", "sess2")

    await close_session("vedant", "sess2")

    # Empty extraction is a clean run → completed, but no entity files created.
    assert is_post_processed("vedant", "sess2")
    assert not (tmp_memory / "members" / "vedant" / "conversations.md").exists()
    assert not (tmp_memory / "members" / "vedant" / "recommendations.md").exists()


async def test_second_close_adds_no_duplicate(tmp_memory, fake_provider):
    fake_provider.payload = {"summary_3_lines": ["one", "two", "three"]}
    memory_updater._provider = fake_provider
    _write_transcript("vedant", "sess3")

    await close_session("vedant", "sess3")
    await close_session("vedant", "sess3")  # already processed → no-op

    conv = (tmp_memory / "members" / "vedant" / "conversations.md").read_text()
    assert conv.count("## ") == 1  # exactly one dated block
    assert fake_provider.calls == 1
