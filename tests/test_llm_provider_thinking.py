"""complete_json must support extended thinking for the extractor.

Extended thinking forbids forced tool choice, so when a thinking budget is set
the provider switches tool_choice to "auto" and passes the thinking block;
with no budget it keeps the original forced single-tool behavior.
"""
from __future__ import annotations

import pytest

from backend.agent.llm_provider import AnthropicProvider, SystemBlock

_TOOL = {"name": "classify", "input_schema": {"type": "object", "properties": {}}}


class _ToolBlock:
    type = "tool_use"

    def __init__(self, payload):
        self.input = payload


class _Resp:
    def __init__(self, payload):
        self.content = [_ToolBlock(payload)]


class _FakeMessages:
    def __init__(self):
        self.kwargs = None

    async def create(self, **kwargs):
        self.kwargs = kwargs
        return _Resp({"ok": True})


class _FakeClient:
    def __init__(self):
        self.messages = _FakeMessages()


@pytest.fixture
def provider():
    p = AnthropicProvider(api_key="x", default_model="claude-sonnet-4-6")
    p._client = _FakeClient()
    return p


async def _call(provider, **extra):
    return await provider.complete_json(
        system=[SystemBlock(text="sys")],
        messages=[{"role": "user", "content": "hi"}],
        tool=_TOOL,
        max_tokens=8000,
        **extra,
    )


async def test_thinking_budget_enables_thinking_and_auto_tool_choice(provider):
    out = await _call(provider, thinking_budget=4000)
    assert out == {"ok": True}
    kw = provider._client.messages.kwargs
    assert kw["thinking"] == {"type": "enabled", "budget_tokens": 4000}
    assert kw["tool_choice"] == {"type": "auto"}


async def test_no_thinking_keeps_forced_tool_choice(provider):
    await _call(provider, thinking_budget=0)
    kw = provider._client.messages.kwargs
    assert "thinking" not in kw
    assert kw["tool_choice"] == {"type": "tool", "name": "classify"}
