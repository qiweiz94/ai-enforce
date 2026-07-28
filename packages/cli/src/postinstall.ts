#!/usr/bin/env node
/**
 * ai-enforce postinstall script
 * Runs after `npm install -g ai-enforce` to print setup instructions.
 */

console.log(`
╔══════════════════════════════════════════════════════════╗
║                ai-enforce installed!                    ║
╚══════════════════════════════════════════════════════════╝

Quick start in any project:

  cd your-project
  ai-enforce init --hooks

This creates .ai-enforce.yaml with default policies and
installs git hooks that block AI coding assistants from:

  • Running destructive commands (rm -rf /, sudo, etc.)
  • Bypassing git hooks (--no-verify, core.hooksPath)
  • Writing to secret files (.env, credentials, *.pem)
  • Leaking API keys (AWS, OpenAI, Anthropic, GitHub)
  • Force-pushing without --force-with-lease

Also available:

  ai-enforce check --ci              # Check staged changes
  ai-enforce check --command <cmd>   # Check a command
  ai-enforce audit                   # View enforcement log

For MCP integration with AI coding assistants:

  npx @ai-enforce/mcp-server

Documentation: https://github.com/nanoclaw/ai-enforce
`)
