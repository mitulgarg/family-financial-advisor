"""On-demand context tool + dispatch.

`handle_read_context` loads one agent-invokable registry file for the ACTIVE
member only — the member is never something the model can pass, so cross-member
reads are structurally impossible. `ToolDispatch.execute` never raises: unknown
tools and handler errors come back as readable error strings the model can
recover from.
"""
from __future__ import annotations

from backend.agent.tools.dispatch import default_dispatch
from backend.agent.tools.read_context import handle_read_context
from backend.config import settings


def _seed(tmp_path, member, filename, body):
    d = tmp_path / "memory" / "members" / member
    d.mkdir(parents=True, exist_ok=True)
    (d / filename).write_text(body)


def test_read_context_reads_active_member_file(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "project_root", tmp_path)
    _seed(tmp_path, "vedant", "life_events.md", "---\nx: 1\n---\n# Life events\n- bought a house 2026-01\n")

    result = handle_read_context({"name": "member.life_events"}, "vedant")

    assert result.ok
    assert "bought a house" in result.content
    assert "---" not in result.content  # frontmatter stripped


def test_read_context_binds_to_active_member_only(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "project_root", tmp_path)
    _seed(tmp_path, "mom", "life_events.md", "# mom\n- mom event\n")
    _seed(tmp_path, "vedant", "life_events.md", "# vedant\n- vedant event\n")

    result = handle_read_context({"name": "member.life_events"}, "mom")

    # Reading as mom returns mom's file; vedant's is unreachable.
    assert "mom event" in result.content
    assert "vedant event" not in result.content


def test_read_context_rejects_non_agent_invoked(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "project_root", tmp_path)
    # family.household is an always-loaded (Tier 1) entry, not agent-invokable.
    result = handle_read_context({"name": "family.household"}, "vedant")

    assert not result.ok
    assert "tool error" in result.content.lower()


def test_read_context_unknown_name_is_error(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "project_root", tmp_path)
    result = handle_read_context({"name": "member.does_not_exist"}, "vedant")
    assert not result.ok


def test_read_context_missing_file_reports_not_found(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "project_root", tmp_path)
    # Valid agent-invokable name, but the file was never written.
    result = handle_read_context({"name": "member.life_events"}, "vedant")
    assert not result.ok
    assert "not found" in result.content.lower()


def test_dispatch_unknown_tool_returns_error_string():
    result = default_dispatch().execute("nope", {}, active_member="vedant")
    assert not result.ok
    assert "unknown tool" in result.content.lower()


def test_dispatch_routes_read_context(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "project_root", tmp_path)
    _seed(tmp_path, "vedant", "recommendations.md", "# Recs\n- start an emergency fund\n")

    result = default_dispatch().execute(
        "read_context", {"name": "member.recommendations"}, active_member="vedant"
    )

    assert result.ok
    assert "emergency fund" in result.content
