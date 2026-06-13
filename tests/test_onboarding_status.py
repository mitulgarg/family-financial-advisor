"""Tests for the onboarding completion marker + status/complete endpoints.

Option-1 completion bar: a member is "finished" once the marker is written
(they reached the finish screen), regardless of which screens they skipped.
The chat reads GET /api/onboarding/status to decide whether to softly nudge the
active member to complete setup first.
"""
from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient

from backend.agent import onboarding
from backend.main import app


def test_status_false_before_completion(tmp_memory) -> None:
    with TestClient(app) as client:
        resp = client.get("/api/onboarding/status", headers={"X-Member-Id": "vedant"})
    assert resp.status_code == 200
    assert resp.json() == {"finished": False}


def test_complete_then_status_true(tmp_memory) -> None:
    with TestClient(app) as client:
        done = client.post(
            "/api/onboarding/complete", headers={"X-Member-Id": "vedant"}
        )
        assert done.status_code == 200
        assert done.json() == {"finished": True}
        resp = client.get("/api/onboarding/status", headers={"X-Member-Id": "vedant"})
    assert resp.json() == {"finished": True}


def test_completion_is_per_member(tmp_memory) -> None:
    with TestClient(app) as client:
        client.post("/api/onboarding/complete", headers={"X-Member-Id": "vedant"})
        resp = client.get("/api/onboarding/status", headers={"X-Member-Id": "mom"})
    assert resp.json() == {"finished": False}


def test_status_rejects_invalid_member_id(tmp_memory) -> None:
    with TestClient(app) as client:
        resp = client.get(
            "/api/onboarding/status", headers={"X-Member-Id": "../etc"}
        )
    assert resp.status_code == 400


def test_status_rejects_unknown_member(tmp_memory) -> None:
    with TestClient(app) as client:
        resp = client.get("/api/onboarding/status", headers={"X-Member-Id": "ghost"})
    assert resp.status_code == 400


def test_mark_complete_writes_dated_marker(tmp_memory) -> None:
    onboarding.mark_complete(tmp_memory, "vedant", today=date(2026, 6, 13))
    marker = tmp_memory / "members" / "vedant" / "onboarding.md"
    assert marker.is_file()
    text = marker.read_text(encoding="utf-8")
    assert "status: complete" in text
    assert "completed_at: 2026-06-13" in text
    assert onboarding.is_complete(tmp_memory, "vedant")
