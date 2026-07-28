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
import { rulesCommand } from './commands/rules.js'
import { scanCommand } from './commands/scan.js'
import { verifyCommand } from './commands/verify.js'
import { policyBuildCommand, policyEvalCommand, policyInitCommand } from './rego-engine.js'

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
  .option('--analyze-reasoning <text>', 'Analyze agent reasoning trace for suspicious patterns')
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

program
  .command('rules')
  .description('Import rules from external sources')
  .argument('[source]', 'Rule source (atr)')
  .option('--output <path>', 'Output directory')
  .option('--lane <mode>', 'Detection lane: enforce, alert, or hunt (default: hunt)')
  .action(rulesCommand)

program
  .command('scan')
  .description('Detect AI coding assistant configurations on this machine')
  .option('--json', 'Output as JSON')
  .option('--dir <path>', 'Custom project directory to scan')
  .action(scanCommand)

program
  .command('verify')
  .description('Verify signed action receipts')
  .argument('[receipt-file]', 'Receipt JSON file to verify (optional — verifies all if omitted)')
  .option('--receipt <path>', 'Path to receipt file')
  .option('--key <path>', 'Public key JWK file for verification')
  .option('--json', 'JSON output')
  .action(verifyCommand)

const policy = program.command('policy').description('Manage Rego/WASM policies')

policy
  .command('init')
  .description('Create a sample .rego policy file')
  .action(policyInitCommand)

policy
  .command('build')
  .description('Compile a .rego file to .wasm (requires opa CLI)')
  .argument('<file>', 'Path to .rego file')
  .option('--output <dir>', 'Output directory')
  .action(policyBuildCommand)

policy
  .command('eval')
  .description('Evaluate a WASM policy against input')
  .argument('<wasm>', 'Path to .wasm file')
  .option('--input <file>', 'JSON input file')
  .action(policyEvalCommand)

program.parse(process.argv)
