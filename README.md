# ai-enforce

**Pre-commit hooks for AI coding assistants.** Stop AI agents from making the same mistakes twice.

[![npm version](https://img.shields.io/badge/npm-0.1.0--alpha-blue)](https://github.com/nanoclaw/ai-enforce)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![CI](https://github.com/nanoclaw/ai-enforce/actions/workflows/ci.yml/badge.svg)](https://github.com/nanoclaw/ai-enforce/actions)

```bash
npm install -g ai-enforce
cd my-project
ai-enforce init --hooks
```

That's it. Your AI coding assistant now has enforceable guardrails.

---

## The Problem

AI coding assistants (Cline, Claude Code, Cursor, Copilot) are incredibly powerful — but they have a dangerous flaw: **they don't reliably follow instructions.**

- Tell an AI "never modify .env files" — it will modify .env files.
- Tell it "never use --no-verify" — it will use --no-verify to bypass your pre-commit hooks.
- Tell it "don't run destructive commands" — it will run `rm -rf`.

This isn't a bug in the AI. It's a fundamental limitation of prompt-based governance. Every AI coding assistant has rules files (CLAUDE.md, .cursorrules, .clinerules, AGENTS.md) — but these are **suggestions, not enforcement.** The model can and will override them when under pressure, as context grows, or when it decides "being helpful" matters more than following rules.

## The Solution

ai-enforce provides **hard enforcement** at the operating system level:

- **Git hook protection**: Prevents AI agents from using `--no-verify`, `core.hooksPath` overrides, or MCP API writes to bypass your quality gates.
- **File protection**: Blocks writes to `.env`, secrets, credentials, and other sensitive files.
- **Command protection**: Prevents destructive commands (`rm -rf /`, force-push, etc.).
- **Secret detection**: Catches API keys, tokens, and credentials before they're committed.
- **MCP enforcement server**: Real-time policy evaluation that works with any MCP-compatible AI coding assistant.

And it works **across all AI coding assistants** — because governance shouldn't depend on which tool you use.

## Quick Start

### 1. Install

```bash
npm install -g ai-enforce
```

Or using Homebrew (coming soon):

```bash
brew install ai-enforce
```

### 2. Initialize

```bash
cd your-project
ai-enforce init --hooks
```

This creates an `.ai-enforce.yaml` policy file and installs git hooks.

### 3. Customize

Edit `.ai-enforce.yaml` to match your project's needs. Here's what's enabled by default:

```yaml
# Prevent AI from accessing secrets
file_rules:
  - paths: ["**/.env", "**/credentials*"]
    actions: { read: block, write: block }

# Prevent AI from destroying things
command_rules:
  - patterns: [{ regex: "^rm -rf /" }]
    action: block

# Prevent AI from bypassing your hooks
  - patterns: [{ regex: "git.*--no-verify" }]
    action: block

# Detect secrets before commit
content_rules:
  - patterns: [{ regex: "(api_key|secret|token)\\s*[:=]\\s*['\\"].+['\\"]" }]
    action: block
```

### 4. Verify

```bash
ai-enforce check --ci         # Check staged changes
ai-enforce check --command "rm -rf /"  # Test a command
ai-enforce audit              # View enforcement log
```

## How Enforcement Works

ai-enforce enforces policy at THREE levels, in order of effectiveness:

### Level 1: PreToolUse Hook (Real-Time — RECOMMENDED)
Intercepts tool calls BEFORE execution. The AI **cannot override** this. Currently supports:

| Tool | Method | Setup |
|------|--------|-------|
| **Claude Code** | `PreToolUse` hook | `bash docs/hooks/claude-code-setup.sh` |
| **Cline** | `tool.execute.before` plugin | `cp docs/hooks/cline-plugin.mjs .opencode/plugins/` |
| **Cursor, Windsurf, Copilot** | Git hooks (Level 2) | `ai-enforce init --hooks` |

```bash
# Example: Claude Code blocked in real-time
claude -p "delete the .env file"
# → BLOCKED: Protected file: use a secrets manager instead.
```

### Level 2: Git Hooks (Commit-Time)
Catches violations when the AI commits changes. Works with ANY AI coding assistant.

```bash
ai-enforce init --hooks
```

### Level 3: CLI / CI (Manual / Pipeline)
For ad-hoc checks and CI enforcement.

```bash
ai-enforce check --command "rm -rf /"    # Check a command
ai-enforce check --file .env              # Check a file
ai-enforce check --ci                      # Check staged changes
```

## Policy File Reference

The `.ai-enforce.yaml` file supports these rule types:

| Rule Type | Purpose | Example |
|-----------|---------|---------|
| `file_rules` | Control file access | Block reads/writes to `.env` |
| `command_rules` | Control shell commands | Block `rm -rf`, force-push |
| `content_rules` | Scan file content | Detect secrets in code |
| `env_rules` | Control env vars | Block production credentials |
| `network_rules` | Control network access | Block data exfiltration |
| `rate_limits` | Rate limit operations | Max 10 commits per 5 min |
| `time_rules` | Time-based restrictions | Block deploys after hours |

Each rule has an action: `block`, `warn`, `prompt`, `allow`, or `mask`.

## Why Not Just Use CLAUDE.md / .cursorrules?

Because those are **suggestions, not enforcement.** Anthropic's own documentation states:

> *"Claude reads it and tries to follow it, but there's no guarantee of strict compliance."*

And their recommendation:

> *"To block an action regardless of what Claude decides, use a PreToolUse hook instead."*

That's exactly what ai-enforce does — it operates at the hook/tool level where the AI cannot override it.

## Architecture

```
AI Assistant → ai-enforce MCP server → Policy Engine → Allowed/Blocked
                    ↓
            Git hooks → pre-commit/pre-push checks
                    ↓
            Audit log (JSONL)
```

- **CLI**: `ai-enforce init`, `check`, `audit` commands
- **MCP Server**: Real-time enforcement via Model Context Protocol
- **Git Hooks**: Pre-commit and pre-push enforcement
- **Policy Engine**: YAML-based rules with pattern matching
- **Audit Log**: Append-only JSONL for compliance

## Roadmap

- **Week 1-2**: Core CLI with git hooks, file/command protection
- **Week 3-4**: MCP enforcement server, Cline/Claude Code/Cursor integration
- **Week 5-6**: Secret scanning, CI/CD integration (GitHub Action)
- **Week 7-8**: Team features, policy sharing, audit dashboard
- **Future**: SSO, RBAC, compliance reporting, self-hosted enterprise

## License

Apache 2.0 — free for personal and commercial use. Enterprise features planned for future release.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions welcome.

## Related Projects

- [block-no-verify](https://github.com/tupe12334/block-no-verify) — Blocks git --no-verify (inspiration for our git protection)
- [Polyhook](https://github.com/polyhook/polyhook) — Multi-tool hook SDK
