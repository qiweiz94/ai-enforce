import { randomUUID } from 'node:crypto'
import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type {
  PolicyFile, ToolCallEvent, EnforcementResult, AuditEntry,
  CommandRule, FileRule, ContentRule, EnforcementAction, PatternDef,
} from './types.js'
import { createSignedEntry, initSigning } from './signing.js'

export const SECRET_ENV_PATTERNS = [
  /\b(?:OPENAI|ANTHROPIC|DEEPSEEK|AWS|GITLAB|OPENCODE)_(?:API_KEY|SECRET|TOKEN)(?![a-zA-Z0-9])/,
  /\b(?:DEEPSEEK_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|AWS_ACCESS_KEY|AWS_SECRET_ACCESS)(?![a-zA-Z0-9])/,
]

export class PolicyEngine {
  private policy: PolicyFile | null = null
  private auditLog: AuditEntry[] = []
  private secretPatterns: PatternDef[] = []
  private rateLimitCounts: Map<string, { count: number; windowStart: number }> = new Map()
  /** Tracks files read in current session — used for edit-before-read enforcement */
  private readFiles: Set<string> = new Set()
  /** Tracks recent edits for auto-verify */
  private recentEdits: Array<{ path: string; tool: string; timestamp: string }> = []

  constructor(private policyPath?: string) {}

  recordFileRead(filePath: string): void {
    this.readFiles.add(filePath)
  }

  hasReadFile(filePath: string): boolean {
    return this.readFiles.has(filePath)
  }

  clearSession(): void {
    this.readFiles.clear()
    this.recentEdits = []
  }

  getRecentEdits(): Array<{ path: string; tool: string; timestamp: string }> {
    return this.recentEdits
  }

  loadPolicy(path?: string): PolicyFile {
    const p = path || this.policyPath
    if (!p || !existsSync(p)) {
      this.policy = this.defaultPolicy()
      return this.policy!
    }
    try {
      const raw = readFileSync(p, 'utf-8')
      this.policy = parseYaml(raw) as PolicyFile
    } catch (err) {
      console.error(`Warning: Failed to parse policy file ${p}: ${err}`)
      console.error('Falling back to default policy.')
      this.policy = this.defaultPolicy()
    }
    this.secretPatterns = this.policy!.patterns || []
    return this.policy!
  }

  evaluate(event: ToolCallEvent): EnforcementResult[] {
    const results: EnforcementResult[] = []
    if (!this.policy) {
      // Fail-closed: no policy means deny everything
      results.push({
        action: 'block', rule_name: 'fail-closed',
        message: 'No policy loaded. Set up .ai-enforce.yaml to enable enforcement.',
        timestamp: new Date().toISOString(),
      })
      return results
    }

    if (event.tool_name === 'bash' || event.tool_name === 'run_command') {
      const cmd = String(event.args.command || '')
      results.push(...this.evaluateCommand(cmd))
      // API key exposure via shell commands (echo $KEY, cat .env, env | grep)
      results.push(...this.checkApiKeyExposure(cmd))
      // Check secrets in command string
      const secretResult = this.checkSecret(cmd)
      if (secretResult) results.push(secretResult)
    }

    if (event.tool_name === 'write_file' || event.tool_name === 'edit') {
      const filePath = String(event.args.filePath || event.args.path || '')
      results.push(...this.evaluateFileWrite(filePath))
      // Edit-before-read enforcement
      if (filePath && !this.readFiles.has(filePath)) {
        results.push({
          action: 'warn',
          rule_name: 'edit-before-read',
          message: `Editing "${filePath}" without reading it first. Read the file first to understand its context.`,
          timestamp: new Date().toISOString(),
        })
      }
      this.recentEdits.push({ path: filePath, tool: event.tool_name, timestamp: event.timestamp })
    }

    if (event.tool_name === 'read' || event.tool_name === 'read_file') {
      const filePath = String(event.args.filePath || '')
      this.readFiles.add(filePath)
      results.push(...this.evaluateFileRead(filePath))
      // Check file content for secrets and content rules
      try {
        const content = readFileSync(filePath, 'utf-8')
        const secretResult = this.checkSecret(content)
        if (secretResult) results.push(secretResult)
        results.push(...this.evaluateContentRules(content, filePath))
      } catch { /* file may not exist or be readable */ }
    }

    if (event.tool_name === 'write_file' || event.tool_name === 'edit') {
      // Also check content for writes (if content is provided)
      const content = String(event.args.content || event.args.text || '')
      if (content) {
        const secretResult = this.checkSecret(content)
        if (secretResult) results.push(secretResult)
        const filePath = String(event.args.filePath || event.args.path || '')
        results.push(...this.evaluateContentRules(content, filePath))
      }
    }

    if (this.policy.settings?.audit_log !== false) {
      for (const r of results) {
        this.audit(r, event)
      }
    }

    return results
  }

  /** Detect API key exposure via shell commands (echo $KEY, cat .env, env | grep KEY, curl with Bearer) */
  checkApiKeyExposure(cmd: string): EnforcementResult[] {
    const results: EnforcementResult[] = []
    const exposurePatterns = [
      // echo $KEY, print $KEY, cat .env
      cmd.match(/^(echo|print|cat|type)\s/) && SECRET_ENV_PATTERNS.some(p => p.test(cmd)),
      // python3 -c "print(os.environ['KEY'])"
      cmd.includes('python3 -c') && cmd.includes('environ') && SECRET_ENV_PATTERNS.some(p => p.test(cmd)),
      // env | grep KEY, export KEY, set KEY
      cmd.match(/^(env|export|set)\b/) && SECRET_ENV_PATTERNS.some(p => p.test(cmd)),
      // curl with Bearer token
      cmd.includes('Bearer') && SECRET_ENV_PATTERNS.some(p => p.test(cmd)),
    ]
    if (exposurePatterns.some(Boolean)) {
      results.push({
        action: 'block',
        rule_name: 'api-key-exposure',
        message: 'Potential API key exposure via shell command. Use environment variables in code instead of printing or transmitting them.',
        timestamp: new Date().toISOString(),
      })
    }
    return results
  }

  /** Auto-verify syntax after edits: returns warnings for syntax errors */
  async autoVerify(filePath: string): Promise<EnforcementResult | null> {
    const { execSync } = await import('node:child_process')
    try {
      if (filePath.endsWith('.py')) {
        execSync(`python3 -m py_compile "${filePath}"`, { stdio: 'pipe' })
      } else if (filePath.endsWith('.json')) {
        execSync(`python3 -m json.tool "${filePath}" > /dev/null 2>&1`, { stdio: 'pipe' })
      } else if (filePath.endsWith('.sh') || filePath.endsWith('.bash')) {
        execSync(`bash -n "${filePath}"`, { stdio: 'pipe' })
      }
    } catch {
      return {
        action: 'warn',
        rule_name: 'auto-verify',
        message: `Syntax error detected in ${filePath.split('/').pop()}. Please check and fix before committing.`,
        timestamp: new Date().toISOString(),
      }
    }
    return null
  }

  private evaluateCommand(cmd: string): EnforcementResult[] {
    const results: EnforcementResult[] = []
    if (!this.policy?.command_rules) return results

    for (const rule of this.policy.command_rules) {
      const matched = this.matchCommandRule(cmd, rule)
      if (matched) {
        results.push({
          action: rule.action,
          rule_name: rule.name,
          message: rule.message,
          matched_pattern: matched,
          timestamp: new Date().toISOString(),
        })
      }
    }
    return results
  }

  private matchCommandRule(cmd: string, rule: CommandRule): string | null {
    for (const p of rule.patterns) {
      if (p.prefix && cmd.trim().startsWith(p.prefix)) {
        if (rule.unless) {
          for (const u of rule.unless) {
            if (u.regex && new RegExp(u.regex, 'i').test(cmd)) return null
          }
        }
        return p.prefix
      }
      if (p.regex && new RegExp(p.regex, 'i').test(cmd)) {
        if (rule.unless) {
          for (const u of rule.unless) {
            if (u.regex && new RegExp(u.regex, 'i').test(cmd)) return null
          }
        }
        return p.regex
      }
    }
    return null
  }

  private evaluateFileWrite(filePath: string): EnforcementResult[] {
    const results: EnforcementResult[] = []
    if (!this.policy?.file_rules) return results

    for (const rule of this.policy.file_rules) {
      if (!rule.actions.write) continue
      if (this.matchGlobList(filePath, rule.paths, rule.exclude)) {
        results.push({
          action: rule.actions.write,
          rule_name: rule.name,
          message: rule.message,
          matched_pattern: filePath,
          timestamp: new Date().toISOString(),
        })
      }
    }
    return results
  }

  private evaluateFileRead(filePath: string): EnforcementResult[] {
    const results: EnforcementResult[] = []
    if (!this.policy?.file_rules) return results

    for (const rule of this.policy.file_rules) {
      if (!rule.actions.read) continue
      if (this.matchGlobList(filePath, rule.paths, rule.exclude)) {
        results.push({
          action: rule.actions.read,
          rule_name: rule.name,
          message: rule.message,
          matched_pattern: filePath,
          timestamp: new Date().toISOString(),
        })
      }
    }
    return results
  }

  /** Evaluate content rules against file content */
  private evaluateContentRules(content: string, filePath: string): EnforcementResult[] {
    const results: EnforcementResult[] = []
    if (!this.policy?.content_rules) return results

    for (const rule of this.policy.content_rules) {
      // Check if rule applies to this file path
      if (rule.paths && rule.paths.length > 0) {
        const matchesPath = rule.paths.some(p => this.matchGlob(filePath, p))
        if (!matchesPath) continue
      }

      for (const pattern of rule.patterns) {
        const regexStr = pattern.regex || pattern.ref
        if (!regexStr) continue
        try {
          const regex = new RegExp(regexStr, 'i')
          if (regex.test(content)) {
            results.push({
              action: rule.action,
              rule_name: rule.name,
              message: rule.message,
              matched_pattern: regexStr.slice(0, 100),
              timestamp: new Date().toISOString(),
            })
          }
        } catch { /* skip invalid regex */ }
      }
    }
    return results
  }

  private matchGlobList(filePath: string, patterns: string[], exclude?: string[]): boolean {
    const match = patterns.some(p => this.matchGlob(filePath, p))
    if (!match) return false
    if (exclude) {
      return !exclude.some(p => this.matchGlob(filePath, p))
    }
    return true
  }

  private matchGlob(filePath: string, pattern: string): boolean {
    // Handle ** patterns: **/.env should match both .env and subdir/.env
    let escaped: string
    if (pattern.startsWith('**/')) {
      const rest = pattern.slice(3)
      const restEscaped = rest
        .replace(/\*\*/g, '___DOUBLESTAR___')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]')
        .replace(/___DOUBLESTAR___/g, '.*')
        .replace(/\./g, '\\.')
      escaped = `(^|.*/)${restEscaped}$`
    } else {
      escaped = pattern
        .replace(/\*\*/g, '___DOUBLESTAR___')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]')
        .replace(/___DOUBLESTAR___/g, '.*')
        .replace(/\./g, '\\.')
      escaped = `^${escaped}$`
    }
    return new RegExp(escaped).test(filePath)
  }

  checkSecret(content: string): EnforcementResult | null {
    const patterns = [
      /(?<![A-Z0-9])(AKIA|ASIA)[0-9A-Z]{16}(?![A-Z0-9])/,
      /(?:sk-[a-zA-Z0-9]{32,})/,
      /(?:ghp_[a-zA-Z0-9]{36})/,
      /(?:gho_[a-zA-Z0-9]{36})/,
      /(?:ghu_[a-zA-Z0-9]{36})/,
      /(?:ghs_[a-zA-Z0-9]{36})/,
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
      /\b(?:OPENAI|ANTHROPIC|DEEPSEEK|GITLAB)_(?:API_KEY|SECRET|TOKEN)(?![a-zA-Z0-9_])/,
      /\bAWS_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|SESSION_TOKEN)(?![a-zA-Z0-9_])/,
      /\b(?:DEEPSEEK_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|AWS_ACCESS_KEY)(?![a-zA-Z0-9_])/,
    ]

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return {
          action: 'block',
          rule_name: 'secret-detection',
          message: 'Potential secret or API key detected in content',
          matched_pattern: pattern.source,
          timestamp: new Date().toISOString(),
        }
      }
    }
    return null
  }

  isDestructiveCommand(cmd: string): boolean {
    const parts = cmd.trim().split(/[;&|]{1,2}/)
    return parts.some(p => {
      const t = p.trim()
      return /^(rm(\s|$)|kill(\s|$)|pkill(\s|$)|reboot(\s|$)|shutdown(\s|$)|poweroff(\s|$))/.test(t)
    })
  }

  checkSudo(cmd: string): boolean {
    return /\bsudo\b/.test(cmd)
  }

  checkPKillPython(cmd: string): boolean {
    return /pkill.*-f.*python/.test(cmd)
  }

  isSSHCmd(cmd: string): boolean {
    return /^ssh\b/.test(cmd.trim()) || /^scp\b/.test(cmd.trim()) || /^rsync\b/.test(cmd.trim())
  }

  extractSSHTarget(cmd: string): string | null {
    const tokens = cmd.trim().split(/\s+/)
    for (const tok of tokens) {
      if (tok === 'ssh' || tok === 'scp' || tok === 'rsync') continue
      if (tok.startsWith('-')) continue
      if (tok.includes('@')) return tok.split('@').pop()!
      return tok
    }
    return null
  }

  checkForcePush(cmd: string): boolean {
    return /git push --force\b/.test(cmd) && !/git push --force-with-lease\b/.test(cmd)
  }

  checkNoVerify(cmd: string): boolean {
    return /git.*--no-verify\b/.test(cmd) ||
      /\bgit\s+commit\s+-n\b/.test(cmd) ||
      /\bgit\s+merge\s+--no-verify\b/.test(cmd) ||
      /\bgit\s+rebase\s+--no-verify\b/.test(cmd) ||
      /\bgit\s+cherry-pick\s+--no-verify\b/.test(cmd) ||
      /\bgit\s+am\s+--no-verify\b/.test(cmd)
  }

  checkHookBypass(cmd: string): boolean {
    return /core\.hooksPath/.test(cmd) ||
      /\bHUSKY=0\b/.test(cmd) ||
      /\bLEFTHOOK=0\b/.test(cmd) ||
      /SKIP=/.test(cmd) ||
      // MCP GitHub API writes that bypass local git hooks
      /\bmcp__github__push_files\b/.test(cmd) ||
      /\bmcp__github__create_or_update_file\b/.test(cmd) ||
      /\bmcp__github__delete_file\b/.test(cmd) ||
      /\bmcp__github__merge_pull_request\b/.test(cmd) ||
      /\bmcp__github__update_pull_request_branch\b/.test(cmd) ||
      // Generic MCP tool detection for file operations via API
      /\bmcp__.*__(?:push|create|delete|write|merge|update)_/i.test(cmd)
  }

  private audit(result: EnforcementResult, event: ToolCallEvent): void {
    // Create signed entry (Ed25519, hash-chained)
    let signed: any
    try {
      initSigning()
      signed = createSignedEntry({
        action: result.action,
        rule_name: result.rule_name,
        message: result.message,
        tool_name: event.tool_name,
      })
    } catch {
      // Fall back to unsigned entry if signing fails
      signed = {
        version: 'audit-entry/v1',
        id: randomUUID(),
        timestamp: result.timestamp,
        action: result.action,
        rule_name: result.rule_name,
        message: result.message,
        tool_name: event.tool_name,
        args: event.args,
        previousEntryHash: null,
      }
    }

    const entry: AuditEntry = {
      timestamp: result.timestamp,
      tool_name: event.tool_name,
      args: event.args,
      rule_name: result.rule_name,
      action: result.action,
      message: result.message,
      session_id: process.env.AI_ENFORCE_SESSION_ID,
    }
    this.auditLog.push(entry)
    // Persist to disk (signed)
    try {
      const dir = join(process.cwd(), '.ai-enforce')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      appendFileSync(join(dir, 'audit.log'), JSON.stringify(signed) + '\n')
    } catch { /* best-effort disk write */ }
  }

  getAuditLog(): AuditEntry[] {
    return this.auditLog
  }

  clearAuditLog(): void {
    this.auditLog = []
  }

  private defaultPolicy(): PolicyFile {
    return { ...DEFAULT_POLICY }
  }
}

export const DEFAULT_POLICY: PolicyFile = {
  version: '1.0',
  name: 'ai-enforce default policy',
  description: 'Sensible defaults for AI coding assistant governance',
  settings: { default_action: 'warn', audit_log: true },
  command_rules: [
    {
      name: 'Block destructive commands',
      patterns: [
        { regex: '^rm -rf /' },
        { regex: '^rm -rf ~' },
        { regex: '^(>\\s*>\\s*)+/dev/' },
        { regex: '\\| sudo bash' },
        { regex: 'pkill.*-f.*python' },
      ],
      action: 'block',
      message: 'Destructive command blocked. This operation could damage your system.',
    },
    {
      name: 'Restrict sudo usage',
      patterns: [{ prefix: 'sudo ' }],
      action: 'block',
      message: 'Sudo commands blocked by default. Use explicit approval if needed.',
    },
    {
      name: 'Block git hook bypass',
      patterns: [
        { regex: 'git.*--no-verify' },
        { regex: 'git push --force(?!-with-lease)' },
        { regex: 'core\\.hooksPath' },
      ],
      action: 'block',
      message: 'Git hook bypass is not allowed. AI agents must respect git hooks.',
    },
    {
      name: 'Require safe force-push',
      patterns: [{ prefix: 'git push --force ' }],
      action: 'block',
      unless: [{ regex: 'git push --force-with-lease' }],
      message: 'Use --force-with-lease instead of --force for safer pushing.',
    },
    {
      name: 'Safe package installers',
      patterns: [
        { regex: '^npm (install|add|i)' },
        { regex: '^pnpm (install|add|i)' },
        { regex: '^yarn add' },
      ],
      action: 'allow',
      message: 'Approved package manager.',
    },
  ],
  file_rules: [
    {
      name: 'Protect secret files',
      paths: ['**/.env', '**/.env.*', '**/credentials*', '**/*.pem', '**/*-key.json'],
      exclude: ['.env.example'],
      actions: { read: 'block', write: 'block', glob: 'block' },
      message: 'Protected file: use a secrets manager instead.',
    },
    {
      name: 'Protect git config',
      paths: ['**/.git/config', '**/.git-credentials'],
      actions: { read: 'block', write: 'block' },
      message: 'Git configuration files are protected.',
    },
  ],
  patterns: [],
  content_rules: [],
}

export const DEFAULT_POLICY_YAML = `# ai-enforce policy file
version: "1.0"
name: "default-policy"
settings:
  default_action: warn
  audit_log: true

command_rules:
  - name: "Block destructive commands"
    patterns:
      - regex: '^rm -rf /'
      - regex: '^rm -rf ~'
      - regex: 'pkill.*-f.*python'
    action: block
    message: "Destructive command blocked."

  - name: "Restrict sudo usage"
    patterns:
      - prefix: "sudo "
    action: block
    message: "Sudo commands blocked by default."

  - name: "Block git hook bypass"
    patterns:
      - regex: 'git.*--no-verify'
      - regex: 'git push --force(?!-with-lease)'
      - regex: "core\\\\.hooksPath"
    action: block
    message: "Git hook bypass is not allowed."

  - name: "Require safe force-push"
    patterns:
      - prefix: "git push --force "
    unless:
      - regex: 'git push --force-with-lease'
    action: block
    message: "Use --force-with-lease instead of --force."

  - name: "Safe package installers"
    patterns:
      - regex: '^npm (install|add|i)'
      - regex: '^pnpm (install|add|i)'
      - regex: '^yarn add'
    action: allow
    message: "Approved package manager."

file_rules:
  - name: "Protect secret files"
    paths:
      - "**/.env"
      - "**/.env.*"
      - "**/credentials*"
      - "**/*.pem"
      - "**/*-key.json"
    exclude:
      - ".env.example"
    actions:
      read: block
      write: block
    message: "Protected file: use a secrets manager instead."

  - name: "Protect git config"
    paths:
      - "**/.git/config"
      - "**/.git-credentials"
    actions:
      read: block
      write: block
    message: "Git configuration files are protected."
`
