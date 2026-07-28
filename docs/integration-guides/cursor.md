# Cursor Integration

## Via MCP

Add to your `.cursor/mcp.json`:

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

## Via Git Hooks

```bash
cd your-project
ai-enforce init --hooks
```

Cursor agent mode will respect the git hooks installed by ai-enforce.
