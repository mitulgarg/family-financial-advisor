"""Tests for the em-dash replacement utility.

User-facing text must never contain an em dash. The utility replaces each one
with a colon, comma, or plain hyphen based on its context, normalising the
surrounding spacing.
"""
from __future__ import annotations

import pytest

from backend.text_utils import replace_em_dashes


def test_numeric_range_becomes_hyphen() -> None:
    assert (
        replace_em_dashes("Returns were 10—12% across 2019—2024")
        == "Returns were 10-12% across 2019-2024"
    )


def test_spaced_dash_before_lowercase_becomes_comma() -> None:
    assert (
        replace_em_dashes("Rough is fine — change it anytime")
        == "Rough is fine, change it anytime"
    )


def test_dash_before_uppercase_becomes_colon() -> None:
    assert (
        replace_em_dashes("One rule — Never time the market")
        == "One rule: Never time the market"
    )


def test_unspaced_parenthetical_pair_becomes_commas() -> None:
    assert (
        replace_em_dashes("the fund—the one you mentioned—is fine")
        == "the fund, the one you mentioned, is fine"
    )


def test_dash_after_existing_punctuation_is_dropped() -> None:
    assert replace_em_dashes("Done,— extra") == "Done, extra"


def test_trailing_dash_is_removed() -> None:
    assert replace_em_dashes("I was thinking—") == "I was thinking"


def test_line_leading_dash_becomes_list_hyphen() -> None:
    assert (
        replace_em_dashes("—Buy a house\n—Retire early")
        == "- Buy a house\n- Retire early"
    )


def test_dash_at_end_of_line_keeps_newline() -> None:
    assert replace_em_dashes("first thought—\nsecond") == "first thought\nsecond"


@pytest.mark.parametrize(
    "text",
    ["", "no dashes here", "an en dash 2019–2024 stays", "hyphen-ated"],
)
def test_text_without_em_dashes_is_unchanged(text: str) -> None:
    assert replace_em_dashes(text) == text


def test_result_never_contains_em_dash() -> None:
    messy = "a—b — C, 1—2,— end—"
    assert "—" not in replace_em_dashes(messy)
