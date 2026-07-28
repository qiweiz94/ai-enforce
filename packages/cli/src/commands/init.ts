import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import chalk from 'chalk'
import { DEFAULT_POLICY_YAML } from '../policy-engine.js'

export async function initCommand(options: { hooks?: boolean }) {
  const cwd = process.cwd()
  const policyPath = join(cwd, '.ai-enforce.yaml')

  if (existsSync(policyPath)) {
    console.log(chalk.yellow('.ai-enforce.yaml already exists. Use ai-enforce check to verify it.'))
  } else {
    writeFileSync(policyPath, DEFAULT_POLICY_YAML, 'utf-8')
    console.log(chalk.green('✓ Created .ai-enforce.yaml'))
  }

  if (options.hooks) {
    // Check if pre-commit framework is installed
    let usePreCommit = false
    try {
      execSync('pre-commit --version', { stdio: 'ignore' })
      usePreCommit = true
    } catch { /* pre-commit not installed */ }

    if (usePreCommit && existsSync(join(cwd, '.pre-commit-config.yaml'))) {
      console.log(chalk.cyan('  Detected pre-commit framework.'))
      console.log(chalk.cyan('  Add to .pre-commit-config.yaml:'))
      console.log(chalk.cyan('    repos:'))
      console.log(chalk.cyan('      - repo: https://github.com/nanoclaw/ai-enforce'))
      console.log(chalk.cyan('        rev: v0.1.0'))
      console.log(chalk.cyan('        hooks:'))
      console.log(chalk.cyan('          - id: ai-enforce-check'))
    }

    const hooksDir = join(cwd, '.git', 'hooks')
    if (!existsSync(hooksDir)) {
      console.log(chalk.red('✗ No .git/hooks directory found. Are you in a git repository?'))
      return
    }
    installHook(hooksDir, 'pre-commit')
    installHook(hooksDir, 'pre-push')
    console.log(chalk.green('✓ Installed git hooks'))
  }

  console.log(chalk.cyan('\nNext steps:'))
  console.log('  1. Review .ai-enforce.yaml and customize the rules')
  console.log('  2. Run ai-enforce check --ci to verify compliance')
  console.log('  3. Commit .ai-enforce.yaml to your repository')
  if (!options.hooks) {
    console.log('  4. Run ai-enforce init --hooks to install git hook enforcement')
  }
}

function installHook(hooksDir: string, hookName: string) {
  const hookPath = join(hooksDir, hookName)
  const backupPath = join(hooksDir, `${hookName}.ai-enforce-backup`)

  if (existsSync(hookPath)) {
    // Backup existing hook
    const existing = readFileSync(hookPath, 'utf-8')
    writeFileSync(backupPath, existing, 'utf-8')
    console.log(chalk.yellow(`  Backed up existing ${hookName} hook to ${hookName}.ai-enforce-backup`))
  }

  writeFileSync(hookPath, `#!/bin/bash
# ai-enforce ${hookName} hook
# This hook was installed by ai-enforce init
set -e
command -v ai-enforce >/dev/null 2>&1 || { echo "ai-enforce not installed. Run: npm install -g ai-enforce"; exit 0; }
ai-enforce check --ci
`, 'utf-8')
  execSync(`chmod +x "${hookPath}"`)
}
