# Changelog

## 0.1.0 (2026-07-28)

Initial alpha release.

### Features
- **CLI**: `ai-enforce init`, `check`, `audit` commands
- **Git hook protection**: Blocks `--no-verify`, `core.hooksPath` overrides, git hook bypass
- **File protection**: Blocks reads/writes to `.env`, credentials, private keys
- **Command protection**: Blocks destructive commands (`rm -rf /`, `sudo`, `pkill -f python`)
- **Secret detection**: Detects API keys, tokens, credentials in files and shell commands
- **API key exposure guard**: Detects `echo $KEY`, `cat .env`, `env | grep` patterns
- **Edit-before-read enforcement**: Warns when editing files without reading them first
- **Auto-verify**: Syntax checks Python, JSON, and shell files after edits
- **MCP enforcement server**: Real-time policy checking via Model Context Protocol
- **Session tracking**: Tracks read files and events across a session
- **Audit log**: Append-only JSONL log with timestamps and rule details
- **--ci mode**: Check staged git changes against policy

### Integrations
- Cline (MCP server)
- Claude Code (MCP server + PreToolUse hooks)
- Cursor (MCP server)
- Aider (git hooks)
- GitHub Copilot (git hooks + GitHub Action)

### Limitations (alpha)
- MCP server provides policy checking tools (not a full forwarding proxy)
- HTTP proxy mode available experimentally
- Windows support pending
