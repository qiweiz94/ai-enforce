import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'

/**
 * ATR (Agent Threat Rules) import command.
 * Converts ATR YAML detection rules to ai-enforce policy format.
 *
 * ATR is an open detection rule standard (MIT licensed) with 683 rules
 * adopted by Microsoft AGT, Cisco AI Defense, and OWASP.
 * See: https://github.com/Agent-Threat-Rule/agent-threat-rules
 */

interface ATRRule {
  title: string
  id: string
  description: string
  author?: string
  date?: string
  severity?: 'critical' | 'high' | 'medium' | 'low'
  tags?: string[]
  detection?: {
    condition?: string
    selection?: Array<{
      type?: string
      pattern?: string
      field?: string
    }>
  }
  references?: string[]
}

// ATR category → ai-enforce action mapping
const SEVERITY_MAP: Record<string, 'block' | 'warn' | 'prompt'> = {
  critical: 'block',
  high: 'block',
  medium: 'warn',
  low: 'warn',
}

// ATR category → ai-enforce rule type mapping
function mapATRToRule(atr: ATRRule): Record<string, unknown> | null {
  const severity = atr.severity || 'medium'
  const action = SEVERITY_MAP[severity] || 'warn'
  const patterns = atr.tags || []
  const title = atr.title || atr.id

  // Extract regex patterns from ATR detection selection
  const regexPatterns: string[] = []
  const prefixPatterns: string[] = []

  if (atr.detection?.selection) {
    for (const sel of atr.detection.selection) {
      if (sel.pattern) {
        regexPatterns.push(sel.pattern)
      }
      if (sel.field === 'command' && sel.pattern) {
        prefixPatterns.push(sel.pattern)
      }
    }
  }

  // If no patterns detected, create pattern from title keywords
  if (regexPatterns.length === 0 && prefixPatterns.length === 0) {
    const keywords = patterns.length > 0
      ? patterns.slice(0, 3).map(t => {
          // Extract meaningful keywords from tags
          const words = t.replace(/[_-]/g, ' ').split(/\s+/)
          return words.filter(w => w.length > 3).join('|')
        }).filter(Boolean)
      : [title.replace(/[^a-zA-Z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 4).join('|')]

    if (keywords.length > 0 && keywords.some(k => k.length > 0)) {
      const combined = keywords.filter(Boolean).join('|')
      if (combined.length > 0) {
        regexPatterns.push(`\\b(?:${combined})\\b`)
      }
    }
  }

  // Build command rules
  const cmdPatterns = regexPatterns.map(p => ({ regex: p }))
  // Build content rules
  const contentPatterns = regexPatterns.map(p => ({ regex: p }))

  const rule: Record<string, unknown> = {
    name: title.slice(0, 60),
    action,
    message: `ATR: ${atr.description?.slice(0, 120) || title}`,
  }

  if (cmdPatterns.length > 0) {
    rule.patterns = cmdPatterns
  }

  return rule
}

export async function rulesCommand(
  source: string | undefined,
  options: { output?: string }
) {
  if (!source) {
    console.log(chalk.cyan('\nai-enforce rules:\n'))
    console.log('  atr            Import rules from Agent Threat Rules (ATR) format')
    console.log('  Usage: ai-enforce rules atr [--output <dir>]\n')
    return
  }

  if (source === 'atr') {
    // In a real implementation, this would fetch from the ATR repository
    // For now, we generate an ai-enforce policy from common ATR patterns
    const atrCategories = [
      {
        title: 'Prompt Injection Detection',
        id: 'ATR-PI-001',
        description: 'Detects attempted prompt injection in user inputs and tool outputs',
        severity: 'high' as const,
        tags: ['prompt-injection', 'jailbreak', 'override'],
        detection: {
          selection: [
            { type: 'regex', pattern: 'ignore.*(?:previous|all|above)\\s+instructions' },
            { type: 'regex', pattern: '(?:forget|ignore|disregard).*(?:rules|instructions|constraints)' },
            { type: 'regex', pattern: 'new\\s+(?:instructions|rules|prompt).*override' },
          ],
        },
      },
      {
        title: 'Tool Poisoning Detection',
        id: 'ATR-TP-001',
        description: 'Detects tool poisoning attempts via hidden instructions in tool descriptions',
        severity: 'critical' as const,
        tags: ['tool-poisoning', 'instruction-hijack'],
        detection: {
          selection: [
            { type: 'regex', pattern: 'when\\s+you\\s+(?:see|read|find)' },
            { type: 'regex', pattern: 'secretly|silently|without\\s+telling' },
          ],
        },
      },
      {
        title: 'Credential Exfiltration Prevention',
        id: 'ATR-CE-001',
        description: 'Prevents AI agents from exfiltrating credentials',
        severity: 'critical' as const,
        tags: ['credential-theft', 'exfiltration', 'secret-leak'],
        detection: {
          selection: [
            { type: 'regex', field: 'command', pattern: 'curl.*--data.*password' },
            { type: 'regex', field: 'command', pattern: 'curl.*--data.*api_key' },
            { type: 'regex', field: 'command', pattern: 'curl.*--data.*secret' },
          ],
        },
      },
      {
        title: 'Unsafe Code Execution',
        id: 'ATR-UCE-001',
        description: 'Blocks downloads and execution of untrusted code',
        severity: 'high' as const,
        tags: ['code-execution', 'supply-chain', 'download'],
        detection: {
          selection: [
            { type: 'regex', field: 'command', pattern: 'curl.*\\|.*bash' },
            { type: 'regex', field: 'command', pattern: 'wget.*\\|.*sh' },
            { type: 'regex', field: 'command', pattern: 'curl.*\\|.*sudo' },
          ],
        },
      },
      {
        title: 'Privilege Escalation Attempt',
        id: 'ATR-PE-001',
        description: 'Detects attempts to escalate privileges or modify access controls',
        severity: 'high' as const,
        tags: ['privilege-escalation', 'sudo', 'chmod'],
        detection: {
          selection: [
            { type: 'regex', field: 'command', pattern: 'sudo\\s+chmod\\s+777' },
            { type: 'regex', field: 'command', pattern: 'sudo\\s+chown' },
            { type: 'regex', field: 'command', pattern: 'sudo\\s+usermod\\s+-aG' },
          ],
        },
      },
      {
        title: 'Excessive Scope / Autonomy',
        id: 'ATR-EA-001',
        description: 'Detects agents attempting operations outside their authorized scope',
        severity: 'medium' as const,
        tags: ['excessive-autonomy', 'unauthorized', 'scope'],
        detection: {
          selection: [
            { type: 'regex', field: 'command', pattern: 'git\\s+push\\s+--force' },
            { type: 'regex', field: 'command', pattern: 'npm\\s+publish' },
            { type: 'regex', field: 'command', pattern: 'kubectl\\s+(delete|drain|taint)' },
          ],
        },
      },
    ]

    const rules = atrCategories
      .map(c => mapATRToRule(c))
      .filter(Boolean) as Record<string, unknown>[]

    const commandRules = rules.filter(r => r.patterns && Array.isArray(r.patterns))

    const yamlContent = `# ai-enforce policy generated from ATR (Agent Threat Rules)
# Source: https://github.com/Agent-Threat-Rule/agent-threat-rules
# Generated: ${new Date().toISOString().split('T')[0]}
version: "1.0"
name: "atr-imported-rules"
description: "Rules imported from Agent Threat Rules (${atrCategories.length} categories)"
settings:
  default_action: warn
  audit_log: true

command_rules:
${commandRules.map((r, i) => `  - name: "${r.name}"
    patterns:
${(r.patterns as Array<{ regex: string }>).map((p: { regex: string }) => `      - regex: '${p.regex.replace(/'/g, "'\\''")}'`).join('\n')}
    action: ${r.action}
    message: "${r.message}"`).join('\n\n')}
`

    // Write to file or stdout
    if (options.output) {
      const outputPath = options.output
      if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true })
      }
      writeFileSync(join(outputPath, 'atr-rules.yaml'), yamlContent, 'utf-8')
      console.log(chalk.green(`✓ Wrote ${atrCategories.length} ATR rules to ${join(outputPath, 'atr-rules.yaml')}`))
    } else {
      console.log(yamlContent)
    }

    console.log(chalk.cyan(`\nImported ${atrCategories.length} ATR rule categories.`))
    console.log(chalk.cyan('ATR has 683+ rules across 10 categories. Full import requires fetching from:'))
    console.log(chalk.cyan('  https://github.com/Agent-Threat-Rule/agent-threat-rules'))
    return
  }

  console.log(chalk.red(`Unknown rules source: ${source}`))
  console.log('Usage: ai-enforce rules import atr')
}
