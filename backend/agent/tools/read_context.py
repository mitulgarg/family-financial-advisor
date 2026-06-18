"""The `read_context` handler: load one agent-invokable registry file.

The member is injected by the handler from the active session, never supplied by
the model — so a member-scoped read can only ever hit the active member's own
file, and a non-agent-invokable name (a Tier 1 file) is refused. Returns the
file text stripped of frontmatter, or a readable error/not-found string.
"""
from __future__ import annotations

from backend.agent.context_registry import entry_by_name, resolve_path
from backend.agent.tools.dispatch import ToolResult
from backend.config import settings
from backend.utils.markdown_io import read_markdown_or_none, strip_frontmatter


def handle_read_context(tool_input: dict, active_member: str) -> ToolResult:
    name = tool_input.get("name")
    entry = entry_by_name(name) if isinstance(name, str) else None
    if entry is None or entry.preload != "agent_invoked":
        return ToolResult(f"[tool error] not an on-demand context: {name!r}", ok=False)

    path = resolve_path(entry, active_member, settings.project_root)
    content = read_markdown_or_none(path)
    if content is None:
        return ToolResult(f"[not found] {name}", ok=False)

    return ToolResult(strip_frontmatter(content).strip(), ok=True)
