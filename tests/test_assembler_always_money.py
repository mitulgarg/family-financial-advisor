"""The advisor's core financial picture is always in context on a FULL turn.

Income, assets, goals, and risk are promoted to always-loaded: a user who asks
"what are my goals" or "how much do I earn" must never get "no idea" when the
data exists, regardless of which intent the classifier guessed. The assembler
must also not double-load a file when an intent ALSO predicts it.

Separately: the persona must not hardcode a family surname (the user never
entered one — it must come from data or not at all).
"""
from __future__ import annotations

import pytest

from backend.agent.assembler import assemble
from backend.config import settings

# FULL turn where the classifier predicted NO tier-2 files (e.g. a "general" or
# "what do you know about me" question) — the worst case for the old design.
FULL_NO_FILES = {"context_level": "FULL", "relevant_memory_files": [], "is_followup": False}


@pytest.fixture
def full_root(tmp_path, monkeypatch):
    """Point the whole project_root at tmp so the assembler reads tmp memory +
    skills, then seed the minimum required files plus the four money files."""
    (tmp_path / "skills").mkdir()
    real_persona = (settings.project_root / "skills" / "core_system.md").read_text()
    (tmp_path / "skills" / "core_system.md").write_text(real_persona)

    mem = tmp_path / "memory"
    (mem / "family").mkdir(parents=True)
    d = mem / "members" / "vedant"
    d.mkdir(parents=True)
    (mem / "family" / "household.md").write_text(
        "---\nlast_updated: 2026-06-14\n---\n# Household\n## Members\n| vedant | vedant | self | yes |\n"
    )
    (d / "profile.md").write_text("## identity.name\n- name: vedant\n- status: CURRENT\n")
    (d / "finances.md").write_text("## income.salary\n- value: 120000\n- status: CURRENT\n")
    (d / "goals.md").write_text("## A trip\n- target: 200000\n- status: CURRENT\n")
    (d / "portfolio_summary.md").write_text("## mf-sip\n- value: 640000\n- status: CURRENT\n")
    (d / "risk_profile.md").write_text("## risk_tolerance\n- stance: moderate\n- status: CURRENT\n")

    monkeypatch.setattr(settings, "project_root", tmp_path)
    monkeypatch.setattr(settings, "memory_dir", mem)
    return mem


def _full_text(mem, classifier=FULL_NO_FILES) -> str:
    prompt = assemble(
        active_member="vedant",
        classifier_output=classifier,
        in_session_history=[],
        user_message="what are my goals",
        memory_root=mem,
        skills_root=settings.resolve(settings.skills_dir),
    )
    return "\n\n".join(b.text for b in prompt.system)


def test_money_always_loaded_with_no_predicted_files(full_root) -> None:
    text = _full_text(full_root)
    assert "120000" in text  # income (finances)
    assert "200000" in text  # goal target (goals)
    assert "640000" in text  # asset (portfolio)
    assert "moderate" in text  # risk tolerance


def test_money_not_double_loaded_when_intent_predicts_it(full_root) -> None:
    classifier = {
        "context_level": "FULL",
        "relevant_memory_files": ["members/vedant/finances"],
        "is_followup": False,
    }
    text = _full_text(full_root, classifier)
    assert text.count("120000") == 1


def test_persona_does_not_hardcode_family_surname() -> None:
    persona = (settings.project_root / "skills" / "core_system.md").read_text().lower()
    assert "shah" not in persona
