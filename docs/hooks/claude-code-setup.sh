#!/bin/bash
# Setup script: Install ai-enforce Claude Code PreToolUse hook for real-time enforcement
set -euo pipefail

echo "ai-enforce — Installing Claude Code PreToolUse hook..."

# Check prerequisites
command -v ai-enforce >/dev/null 2>&1 || { echo "Error: ai-enforce not installed. Run: npm install -g ai-enforce"; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "Warning: Claude Code CLI not found. The hook will work when Claude Code is installed."; }

# Create hook directory
HOOK_DIR=".ai-enforce/hooks"
mkdir -p "$HOOK_DIR"

# Install the PreToolUse hook script
HOOK_SCRIPT="$HOOK_DIR/pre-tool-use.sh"
cp "$(dirname "$0")/claude-code-pre-tool-use.sh" "$HOOK_SCRIPT"
chmod +x "$HOOK_SCRIPT"

# Install or update Claude Code settings
SETTINGS_DIR=".claude"
SETTINGS_FILE="$SETTINGS_DIR/settings.json"
mkdir -p "$SETTINGS_DIR"

if [ -f "$SETTINGS_FILE" ]; then
  echo "Warning: $SETTINGS_FILE already exists. Merge manually or remove it first."
  echo ""
  echo "Add this to your existing settings.json:"
  cat "$(dirname "$0")/claude-code-settings-template.json"
else
  cat "$(dirname "$0")/claude-code-settings-template.json" > "$SETTINGS_FILE"
  echo "Created $SETTINGS_FILE"
fi

echo ""
echo "✓ ai-enforce PreToolUse hook installed!"
echo ""
echo "How it works:"
echo "  Claude Code will call ai-enforce BEFORE every bash command and file edit."
echo "  Blocked actions never execute — the AI cannot override this."
echo ""
echo "Test it:"
echo "  claude -p 'try to run rm -rf /'"
echo "  → Should be blocked immediately"
