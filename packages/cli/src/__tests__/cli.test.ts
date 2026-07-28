import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const CLI = join(process.cwd(), 'packages', 'cli', 'dist', 'index.js')
let testDir: string

function run(args: string): string {
  try {
    return execSync(`node "${CLI}" ${args}`, {
      encoding: 'utf-8',
      cwd: testDir,
      timeout: 10000,
    })
  } catch (err: any) {
    return err.stdout || err.message
  }
}

describe('CLI Integration', () => {
  beforeAll(() => {
    // Create temp git repo
    testDir = execSync('mktemp -d', { encoding: 'utf-8' }).trim()
    execSync('git init', { cwd: testDir })
    execSync('git config user.email test@test.com', { cwd: testDir })
    execSync('git config user.name test', { cwd: testDir })
  })

  afterAll(() => {
    execSync(`rm -rf "${testDir}"`)
  })

  it('shows version', () => {
    const out = run('--version')
    expect(out.trim()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('init creates config and hooks', () => {
    const out = run('init --hooks')
    expect(out).toContain('Created .ai-enforce.yaml')
    expect(out).toContain('Installed git hooks')
    expect(existsSync(join(testDir, '.ai-enforce.yaml'))).toBe(true)
    expect(existsSync(join(testDir, '.git', 'hooks', 'pre-commit'))).toBe(true)
  })

  it('check --command blocks dangerous commands', () => {
    const out = run('check --command "rm -rf /"')
    expect(out).toContain('BLOCKED')
  })

  it('check --command blocks no-verify', () => {
    const out = run('check --command "git commit --no-verify -m x"')
    expect(out).toContain('BLOCKED')
  })

  it('check --command blocks sudo', () => {
    const out = run('check --command "sudo rm file"')
    expect(out).toContain('BLOCKED')
  })

  it('check --command blocks pkill python', () => {
    const out = run('check --command "pkill -f python"')
    expect(out).toContain('BLOCKED')
  })

  it('check --command allows safe commands', () => {
    const out = run('check --command "npm install express"')
    expect(out).toContain('OK')
  })

  it('check --command blocks secret exposure', () => {
    const out = run(`check --command "echo \\$OPENAI_API_KEY"`)
    expect(out).toContain('BLOCKED')
  })

  it('check detects secrets in file', () => {
    writeFileSync(join(testDir, 'test.txt'), 'OPENAI_API_KEY=sk-test123-test-test-test-abcdefgh', 'utf-8')
    const out = run('check test.txt')
    expect(out).toContain('BLOCKED')
  })

  it('audit shows log', () => {
    // Run a command first to generate audit entry
    run('check --command "rm -rf /"')
    const out = run('audit')
    expect(out).toContain('BLOCKED')
  })

  it('audit --json outputs JSON', () => {
    const out = run('audit --json')
    expect(() => JSON.parse(out)).not.toThrow()
  })

  it('template lists available templates', () => {
    const out = run('template --list')
    expect(out).toContain('default')
    expect(out).toContain('strict')
    expect(out).toContain('minimal')
    expect(out).toContain('security')
  })

  it('rules atr imports ATR rules', () => {
    const out = run('rules atr')
    expect(out).toContain('ATR')
    expect(out).toContain('Prompt Injection')
  })

  it('scan detects tools', () => {
    const out = run('scan')
    expect(out).toContain('ai-enforce scan')
  })

  it('verify shows help with no args', () => {
    const out = run('verify')
    expect(out).toContain('receipt')
  })

  it('init idempotent when already exists', () => {
    const out = run('init')
    expect(out).toContain('already exists')
  })

  it('check --ci with no staged changes succeeds', () => {
    const out = run('check --ci')
    expect(out).toContain('No staged changes')
  })
})
