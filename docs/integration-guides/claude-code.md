# Claude Code Integration

## Option 1: PreToolUse Hook (Recommended — Real-Time Enforcement)

This is the most effective method. It intercepts EVERY tool call BEFORE Claude Code executes it.
Blocked actions never reach the filesystem. The AI cannot override this.

**Install the hook in your project:**

```bash
bash docs/hooks/claude-code-setup.sh
```

This creates `.ai-enforce/hooks/pre-tool-use.sh` and configures `.claude/settings.json`.

**Or install manually:**

1. Create `.ai-enforce/hooks/` and copy the [pre-tool-use.sh](../hooks/claude-code-pre-tool-use.sh) script
2. Add this to your `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(*)",
        "hooks": [
          { "type": "command", "command": "bash .ai-enforce/hooks/pre-tool-use.sh", "timeout": 5000 }
        ]
      },
      {
        "matcher": "Edit(*)",
        "hooks": [
          { "type": "command", "command": "bash .ai-enforce/hooks/pre-tool-use.sh", "timeout": 5000 }
        ]
      }
    ]
  }
}
```

**How it works:**
- Every time Claude Code tries to run a command or edit a file, the hook fires
- The hook calls `ai-enforce check --command "$COMMAND"` to check the policy
- If blocked, the hook returns `permissionDecision: "deny"` with the reason
- Claude Code MUST respect this — it cannot bypass the PreToolUse hook
- This is exactly what Anthropic recommends: *"To block an action regardless of what Claude decides, use a PreToolUse hook."*

**Test it:**

```bash
claude -p "try to run rm -rf /"
```

The command will be blocked immediately with a message like:
```
ai-enforce: Destructive command blocked by policy.
```

## Option 2: MCP Server (Policy Checking)

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "ai-enforce": {
      "command": "npx",
      "args": ["-y", "@ai-enforce/mcp-server"],
      "env": {
        "AI_ENFORCE_POLICY": "${workspaceFolder}/.ai-enforce.yaml"
      }
    }
  }
}
```

Or using the CLI:

```bash
claude mcp add --transport stdio ai-enforce -- npx -y @ai-enforce/mcp-server
```

**Note:** The MCP server exposes `ai_enforce_check` and `ai_enforce_audit` tools that Claude *can* call before acting, but it requires voluntary compliance. For hard enforcement, use Option 1.

## Option 3: Git Hooks (Post-Hoc Enforcement)

```bash
cd your-project
ai-enforce init --hooks
```

Catches violations at commit time rather than preventing them in real-time.
