#!/bin/bash
# Claude Code PreToolUse hook for ai-enforce.
# This hook intercepts EVERY tool call BEFORE Claude Code executes it.
# Blocked actions never reach the filesystem — the AI cannot override them.
#
# Install: Copy this to your project and reference it in .claude/settings.json
# 
# How it works:
#   Claude Code calls this hook before EVERY Bash/Edit/Write operation.
#   We check the command against ai-enforce policy.
#   If blocked, we return permissionDecision: "deny" with a clear reason.
#   Claude Code MUST respect this denial — it cannot bypass it.
#
# Anthropic's own recommendation:
#   "To block an action regardless of what Claude decides, use a PreToolUse hook."

set -euo pipefail

# Read the JSON event from stdin (Claude Code sends it here)
INPUT=$(cat)

# Extract the tool name and input
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")
TOOL_INPUT=$(echo "$INPUT" | grep -o '"input":[^}]*}' | head -1 || echo "")

# Extract the bash command or file path based on tool type
if [ "$TOOL_NAME" = "Bash" ] || [ "$TOOL_NAME" = "bash" ]; then
  COMMAND=$(echo "$TOOL_INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
elif [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ]; then
  COMMAND=$(echo "$TOOL_INPUT" | grep -o '"filePath":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
else
  # Not a tool we can check — allow it
  echo '{"permissionDecision":"allow"}'
  exit 0
fi

# Skip empty commands
if [ -z "$COMMAND" ]; then
  echo '{"permissionDecision":"allow"}'
  exit 0
fi

# Check against ai-enforce policy
if command -v ai-enforce &>/dev/null; then
  RESULT=$(ai-enforce check --command "$COMMAND" 2>&1 || true)
  if echo "$RESULT" | grep -q "BLOCKED"; then
    REASON=$(echo "$RESULT" | grep "BLOCKED" | head -1 | sed 's/.*\[BLOCKED\] //' | sed 's/ (.*)//' || echo "Blocked by ai-enforce policy")
    cat <<EOF
{
  "permissionDecision": "deny",
  "permissionDecisionReason": "ai-enforce: ${REASON}"
}
EOF
    exit 0
  fi
fi

# Not blocked — allow the action
echo '{"permissionDecision":"allow"}'
