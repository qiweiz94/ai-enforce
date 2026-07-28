#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { checkCommand } from './commands/check.js'
import { auditCommand } from './commands/audit.js'
import { serveCommand } from './commands/serve.js'
import { templateCommand } from './commands/template.js'

// Read version from package.json
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))
const VERSION = pkg.version

const program = new Command()

program
  .name('ai-enforce')
  .description('Pre-commit hooks for AI coding assistants. Enforce policies across Cline, Claude Code, Cursor, and more.')
  .version(VERSION)

program
  .command('init')
  .description('Initialize ai-enforce in the current project')
  .option('--hooks', 'Also install git hooks')
  .action(initCommand)

program
  .command('check')
  .description('Check a file or command against the policy')
  .argument('[target]', 'File path or command string to check')
  .option('-f, --file <path>', 'Check a specific file')
  .option('-c, --command <cmd>', 'Check a specific command')
  .option('--ci', 'CI mode: exit with error on any violation')
  .action(checkCommand)

program
  .command('audit')
  .description('View the enforcement audit log')
  .option('--json', 'Output as JSON')
  .option('--tail <n>', 'Show last N entries', '50')
  .action(auditCommand)

program
  .command('serve')
  .description('Start the MCP enforcement server')
  .option('--port <number>', 'Port for HTTP transport', '3100')
  .option('--transport <mode>', 'Transport mode: stdio or http', 'stdio')
  .action(serveCommand)

program
  .command('template')
  .description('List or preview policy templates')
  .argument('[name]', 'Template name (default, strict, minimal, security)')
  .option('--list', 'List all available templates')
  .option('--apply', 'Apply template as .ai-enforce.yaml (not yet implemented)')
  .action(templateCommand)

program.parse(process.argv)
