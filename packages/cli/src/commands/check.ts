import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import chalk from 'chalk'
import { PolicyEngine } from '../policy-engine.js'

export async function checkCommand(
  target: string | undefined,
  options: { file?: string; command?: string; ci?: boolean }
) {
  const cwd = process.cwd()
  const engine = new PolicyEngine(join(cwd, '.ai-enforce.yaml'))
  engine.loadPolicy()

  let hasViolations = false

  // --ci mode: check all staged files
  if (options.ci && !options.file && !options.command && !target) {
    try {
      const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
        .trim().split('\n').filter(Boolean)
      if (staged.length === 0) {
        console.log(chalk.green('✓ No staged changes to check.'))
        return
      }
      for (const file of staged) {
        if (!existsSync(file)) continue
        const content = readFileSync(file, 'utf-8')
        const secretResult = engine.checkSecret(content)
        if (secretResult) { printResult(secretResult); hasViolations = true }
        const fileResults = engine.evaluate({
          tool_name: 'write_file', args: { filePath: file }, cwd,
          timestamp: new Date().toISOString(),
        })
        for (const r of fileResults) { printResult(r); hasViolations = true }
      }
      if (!hasViolations) console.log(chalk.green('✓ All staged changes pass policy.'))
    } catch (err) {
      console.log(chalk.red(`Error checking staged changes: ${err}`))
    }
    if (hasViolations) process.exit(1)
    return
  }

  if (options.file || target) {
    const filePath = options.file || target!
    try {
      const content = readFileSync(filePath, 'utf-8')
      const secretResult = engine.checkSecret(content)
      if (secretResult) { printResult(secretResult); hasViolations = true }
      const fileResults = engine.evaluate({
        tool_name: 'read_file', args: { filePath }, cwd,
        timestamp: new Date().toISOString(),
      })
      for (const r of fileResults) { printResult(r); hasViolations = true }
    } catch (err) {
      console.log(chalk.red(`Error reading ${filePath}: ${err}`))
    }
  }

  if (options.command) {
    const cmd = options.command
    // Check for secrets in command string
    const secretResult = engine.checkSecret(cmd)
    if (secretResult) { printResult(secretResult); hasViolations = true }
    // Policy-based command evaluation
    const cmdResults = engine.evaluate({
      tool_name: 'bash', args: { command: cmd }, cwd,
      timestamp: new Date().toISOString(),
    })
    for (const r of cmdResults) { printResult(r); hasViolations = true }
    // Built-in guard checks
    if (engine.isDestructiveCommand(cmd)) {
      printResult({ action: 'block', rule_name: 'destructive-command',
        message: 'Destructive command detected', timestamp: new Date().toISOString() })
      hasViolations = true
    }
    if (engine.checkForcePush(cmd)) {
      printResult({ action: 'block', rule_name: 'force-push',
        message: 'Use --force-with-lease instead of --force', timestamp: new Date().toISOString() })
      hasViolations = true
    }
    if (engine.checkNoVerify(cmd)) {
      printResult({ action: 'block', rule_name: 'no-verify',
        message: 'AI agents must not bypass git hooks with --no-verify', timestamp: new Date().toISOString() })
      hasViolations = true
    }
    if (engine.checkHookBypass(cmd)) {
      const isMCPBypass = /\bmcp__github__/.test(cmd)
      printResult({
        action: 'block', rule_name: 'hook-bypass',
        message: isMCPBypass
          ? 'MCP API write detected — bypasses local git hooks. Use git directly instead.'
          : 'Git hook bypass attempt detected',
        timestamp: new Date().toISOString(),
      })
      hasViolations = true
    }
    if (engine.checkSudo(cmd)) {
      printResult({ action: 'block', rule_name: 'sudo',
        message: 'Sudo usage blocked by policy', timestamp: new Date().toISOString() })
      hasViolations = true
    }
    if (engine.checkPKillPython(cmd)) {
      printResult({ action: 'block', rule_name: 'pkill-python',
        message: 'pkill -f python blocked (can kill system processes)', timestamp: new Date().toISOString() })
      hasViolations = true
    }
  }

  if (!target && !options.file && !options.command && !options.ci) {
    console.log(chalk.cyan('ai-enforce check'))
    console.log('Usage: ai-enforce check <file>')
    console.log('       ai-enforce check --command "<shell-command>"')
    console.log('       ai-enforce check --file <path>')
    console.log('       ai-enforce check --ci  (check staged changes against policy)')
  }

  if (options.ci && hasViolations) {
    process.exit(1)
  }
}

function printResult(result: { action: string; rule_name: string; message: string; timestamp?: string; matched_pattern?: string }) {
  const icon = result.action === 'block' ? chalk.red('✗') :
    result.action === 'warn' ? chalk.yellow('⚠') :
    chalk.green('✓')
  const label = result.action === 'block' ? 'BLOCKED' :
    result.action === 'warn' ? 'WARN' : 'OK'
  console.log(`${icon} [${chalk.bold(label)}] ${result.message} (rule: ${result.rule_name})`)
}
