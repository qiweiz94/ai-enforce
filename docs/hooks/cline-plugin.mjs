/**
 * Cline plugin for ai-enforce — real-time enforcement via tool.execute.before.
 *
 * Install: place this file at .opencode/plugins/ai-enforce.mjs
 *
 * Contract: throwing from `tool.execute.before` blocks the action; returning
 * normally allows it. So EVERY path that cannot reach a clean verdict must
 * throw — see the fail-closed note below.
 */

import { execFileSync } from 'node:child_process'

const BLOCKED = '[BLOCKED]'

/**
 * Ask ai-enforce about one action.
 *
 * `ai-enforce check` exits non-zero when it blocks, so execFileSync THROWS on
 * a block — that is the signal, not an error. An earlier version read only
 * stdout and treated any throw as "checker unavailable, allow", which meant a
 * blocked command was allowed. Exit status is now the primary signal; stdout
 * only supplies the human-readable reason.
 *
 * execFileSync with an argv array, never a shell string: the previous
 * `check --command "${cmd.replace(/"/g,'\\"')}"` still executed backticks and
 * $(...) taken from the very command it was being asked to police.
 */
function decide(args) {
  try {
    execFileSync('ai-enforce', args, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { blocked: false }
  } catch (err) {
    if (typeof err?.status === 'number') {
      const out = String(err.stdout || '') + String(err.stderr || '')
      const line = out.split('\n').find((l) => l.includes(BLOCKED))
      const reason = line
        ? line.replace(/.*\[BLOCKED\]\s*/, '').replace(/\s*\(rule:.*$/, '').trim()
        : 'blocked by ai-enforce policy'
      return { blocked: true, reason }
    }
    // Could not run the checker at all (not installed, spawn failure, timeout).
    // Fail CLOSED: an enforcement layer that cannot evaluate must not wave the
    // action through, or uninstalling the binary silently disables governance.
    return { blocked: true, reason: `enforcement unavailable (${err?.code || 'unknown'})` }
  }
}

export default async function aiEnforcePlugin() {
  // Deliberately NOT gated on .ai-enforce.yaml existing. `ai-enforce check`
  // applies built-in defaults when no policy file is present, so returning
  // early would have meant no enforcement at all for exactly the projects that
  // had not configured anything yet.
  return {
    'tool.execute.before': async (input, output) => {
      const tool = String(input?.tool || '').toLowerCase()
      let args = null

      if (tool === 'bash') {
        const cmd = output?.args?.command
        if (cmd) args = ['check', '--command', String(cmd)]
      } else if (tool === 'write' || tool === 'edit' || tool === 'multiedit') {
        const p = output?.args?.filePath || output?.args?.file_path || output?.args?.path
        // --write: file rules can permit reads while blocking writes, so the
        // question asked has to match the action being taken.
        if (p) args = ['check', '--file', String(p), '--write']
      } else if (tool === 'read') {
        const p = output?.args?.filePath || output?.args?.file_path
        if (p) args = ['check', '--file', String(p)]
      }

      if (!args) return

      const verdict = decide(args)
      if (verdict.blocked) throw new Error(`ai-enforce: ${verdict.reason}`)
    },
  }
}
