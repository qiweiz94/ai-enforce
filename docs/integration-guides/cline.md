# Cline Integration

## Option 1: Cline Plugin (Recommended — Real-Time Enforcement)

This plugin intercepts EVERY tool call BEFORE Cline executes it using `tool.execute.before`.
Blocked actions never reach the filesystem. The AI cannot override this.

**Install:**

```bash
mkdir -p .opencode/plugins/
cp docs/hooks/cline-plugin.mjs .opencode/plugins/ai-enforce.mjs
```

Cline auto-discovers plugins from `.opencode/plugins/`.

**How it works:**
- Every time Cline tries to run a command or write a file, `tool.execute.before` fires
- The plugin calls `ai-enforce check --command "<cmd>"` to check the policy
- If blocked, it throws an error — Cline respects this and blocks the action
- The plugin uses `fail_open` — if ai-enforce is not installed, it allows the action

## Option 2: MCP Server

Add to your `.cline/mcp.json`:

```json
{
  "mcpServers": {
    "ai-enforce": {
      "command": "npx",
      "args": ["-y", "@ai-enforce/mcp-server"]
    }
  }
}
```

## Option 3: Git Hooks

```bash
cd your-project
ai-enforce init --hooks
```
