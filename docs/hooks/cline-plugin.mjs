/**
 * Cline plugin for ai-enforce — real-time enforcement via tool.execute.before.
 *
 * This plugin intercepts EVERY tool call (bash, write, edit) BEFORE execution.
 * Blocked actions never reach the filesystem — the AI cannot override them.
 *
 * Install: Place this file in .opencode/plugins/ai-enforce.mjs
 *
 * How it works:
 *   Cline calls this plugin BEFORE every tool execution.
 *   We check the command/target against ai-enforce policy.
 *   If blocked, we throw an error — Cline respects this and blocks the action.
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const BLOCKED_PREFIX = '✗ [BLOCKED]'

export default async function aiEnforcePlugin({ directory }) {
  const policyPath = join(directory, '.ai-enforce.yaml')
  if (!existsSync(policyPath)) {
    return {} // No policy file — skip enforcement
  }

  return {
    'tool.execute.before': async (input, output) => {
      if (input.tool === 'bash') {
        const cmd = output.args?.command
        if (!cmd) return

        try {
          const result = execSync(`ai-enforce check --command "${cmd.replace(/"/g, '\\"')}"`, {
            encoding: 'utf-8',
            timeout: 5000,
          })
          if (result.includes(BLOCKED_PREFIX)) {
            const reason = result.split(BLOCKED_PREFIX)[1]?.split('\n')[0]?.trim() || 'Blocked by ai-enforce policy'
            throw new Error(`ai-enforce: ${reason}`)
          }
        } catch (err) {
          if (err instanceof Error && err.message.startsWith('ai-enforce:')) {
            throw err
          }
          // Command check failed — allow to proceed (fail open for reliability)
        }
      }

      if (input.tool === 'write' || input.tool === 'edit') {
        const filePath = output.args?.filePath
        if (!filePath) return

        try {
          const result = execSync(`ai-enforce check --file "${filePath}"`, {
            encoding: 'utf-8',
            timeout: 5000,
          })
          if (result.includes(BLOCKED_PREFIX)) {
            const reason = result.split(BLOCKED_PREFIX)[1]?.split('\n')[0]?.trim() || 'Blocked by ai-enforce policy'
            throw new Error(`ai-enforce: ${reason}`)
          }
        } catch (err) {
          if (err instanceof Error && err.message.startsWith('ai-enforce:')) {
            throw err
          }
        }
      }
    },
  }
}
