import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Contract test for the Claude Code PreToolUse hook.
 *
 * This is the only test in the repo that exercises the README's headline
 * claim: "Intercepts EVERY tool call BEFORE the AI executes it. The AI
 * cannot override this."
 *
 * The payload shape below is what Claude Code actually sends —
 * `tool_name`, `tool_input`, `hook_event_name` — verified against the
 * installed binary. Response must nest under `hookSpecificOutput`.
 *
 * NOTE ON PATH: the hook resolves `ai-enforce` from PATH, which on a dev
 * machine is the *globally installed* npm version, not this working tree.
 * We prepend a shim so the test exercises the code under review.
 */

// Resolved from this file's location so the suite works under both
// `npm test` (cwd=packages/cli) and a root-level vitest invocation.
const HERE = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(HERE, '..', '..', '..', '..')
const HOOK = join(REPO_ROOT, 'docs', 'hooks', 'claude-code-pre-tool-use.sh')
const CLI = join(HERE, '..', '..', 'dist', 'index.js')

let testDir: string
let shimPath: string

function runHook(payload: object): { stdout: string; code: number } {
  try {
    const stdout = execSync(`bash "${HOOK}"`, {
      encoding: 'utf-8',
      cwd: testDir,
      input: JSON.stringify(payload),
      timeout: 10000,
      env: { ...process.env, PATH: `${shimPath}:${process.env.PATH}` },
    })
    return { stdout, code: 0 }
  } catch (err: any) {
    return { stdout: err.stdout || err.message, code: err.status ?? 1 }
  }
}

function decision(payload: object): string {
  const { stdout } = runHook(payload)
  let parsed: any
  try {
    parsed = JSON.parse(stdout)
  } catch {
    throw new Error(`hook did not emit valid JSON: ${stdout}`)
  }
  // Accept either the nested (current) or flat (legacy) shape when reading,
  // so this test fails on the *decision*, not on the envelope.
  return parsed?.hookSpecificOutput?.permissionDecision ?? parsed?.permissionDecision
}

describe('Claude Code PreToolUse hook', () => {
  beforeAll(() => {
    testDir = execSync('mktemp -d', { encoding: 'utf-8' }).trim()
    execSync('git init', { cwd: testDir })
    execSync(`node "${CLI}" init`, { cwd: testDir })

    shimPath = join(testDir, 'shim')
    mkdirSync(shimPath, { recursive: true })
    const shim = join(shimPath, 'ai-enforce')
    writeFileSync(shim, `#!/bin/bash\nexec node "${CLI}" "$@"\n`, 'utf-8')
    chmodSync(shim, 0o755)
  })

  afterAll(() => {
    execSync(`rm -rf "${testDir}"`)
  })

  it('denies a destructive bash command', () => {
    expect(
      decision({
        session_id: 'test',
        hook_event_name: 'PreToolUse',
        cwd: testDir,
        tool_name: 'Bash',
        tool_input: { command: 'rm -rf /' },
      })
    ).toBe('deny')
  })

  it('denies a git hook bypass', () => {
    expect(
      decision({
        session_id: 'test',
        hook_event_name: 'PreToolUse',
        cwd: testDir,
        tool_name: 'Bash',
        tool_input: { command: 'git commit --no-verify -m x' },
      })
    ).toBe('deny')
  })

  it('denies a write to a protected file', () => {
    expect(
      decision({
        session_id: 'test',
        hook_event_name: 'PreToolUse',
        cwd: testDir,
        tool_name: 'Write',
        tool_input: { file_path: join(testDir, '.env'), content: 'X=1' },
      })
    ).toBe('deny')
  })

  it('denies an agent rewriting the policy that governs it', () => {
    // The self-disable path: if this is allowed, every other rule is advisory.
    expect(
      decision({
        session_id: 'test',
        hook_event_name: 'PreToolUse',
        cwd: testDir,
        tool_name: 'Write',
        tool_input: { file_path: join(testDir, '.ai-enforce.yaml'), content: '{}' },
      })
    ).toBe('deny')
  })

  it('allows an ordinary command', () => {
    expect(
      decision({
        session_id: 'test',
        hook_event_name: 'PreToolUse',
        cwd: testDir,
        tool_name: 'Bash',
        tool_input: { command: 'ls -la' },
      })
    ).toBe('allow')
  })

  it('does not let an embedded quote smuggle a command past the check', () => {
    // Extraction must survive escaped quotes in the JSON string.
    expect(
      decision({
        session_id: 'test',
        hook_event_name: 'PreToolUse',
        cwd: testDir,
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "wip" --no-verify' },
      })
    ).toBe('deny')
  })

  it('emits the documented nested response envelope', () => {
    const { stdout } = runHook({
      session_id: 'test',
      hook_event_name: 'PreToolUse',
      cwd: testDir,
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
    })
    const parsed = JSON.parse(stdout)
    expect(parsed.hookSpecificOutput?.hookEventName).toBe('PreToolUse')
    expect(parsed.hookSpecificOutput?.permissionDecision).toBeDefined()
  })
})
