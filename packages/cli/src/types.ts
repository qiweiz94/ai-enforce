export interface PolicyFile {
  version: string
  name?: string
  description?: string
  patterns?: PatternDef[]
  file_rules?: FileRule[]
  command_rules?: CommandRule[]
  content_rules?: ContentRule[]
  env_rules?: EnvRule[]
  network_rules?: NetworkRule[]
  rate_limits?: RateLimit[]
  time_rules?: TimeRule[]
  settings?: PolicySettings
}

export interface PolicySettings {
  default_action?: EnforcementAction
  audit_log?: boolean
  fail_on_error?: boolean
}

export type EnforcementAction = 'block' | 'warn' | 'prompt' | 'allow' | 'mask'

export interface EnforcementResult {
  action: EnforcementAction
  rule_name: string
  message: string
  matched_pattern?: string
  timestamp: string
}

export interface PatternDef {
  id: string
  type: 'regex' | 'prefix' | 'glob'
  pattern: string
  description?: string
}

export interface FileRule {
  name: string
  paths: string[]
  exclude?: string[]
  actions: {
    read?: EnforcementAction
    write?: EnforcementAction
    glob?: EnforcementAction
  }
  message: string
}

export interface CommandRule {
  name: string
  patterns: { prefix?: string; regex?: string }[]
  action: EnforcementAction
  message: string
  unless?: { regex?: string }[]
}

export interface ContentRule {
  name: string
  patterns: ({ ref?: string; regex?: string; prefix?: string })[]
  paths?: string[]
  action: EnforcementAction
  mode?: 'commit' | 'read' | 'write' | 'always'
  message: string
}

export interface EnvRule {
  name: string
  vars: string[]
  action: EnforcementAction
  message: string
}

export interface NetworkRule {
  name: string
  patterns: { regex?: string }[]
  action: EnforcementAction
  message?: string
}

export interface RateLimit {
  name: string
  scope: 'tool' | 'repo' | 'user'
  window: number
  max_calls: number
  action: EnforcementAction
  message: string
}

export interface TimeRule {
  name: string
  timezone?: string
  schedule?: { start: string; end: string; days?: string[] }
  subjects: ({ patterns: { regex?: string }[]; paths?: string[] })[]
  outside_schedule_action: EnforcementAction
  message: string
}

export interface ToolCallEvent {
  tool_name: string
  args: Record<string, unknown>
  cwd: string
  timestamp: string
}

export interface AuditEntry {
  timestamp: string
  tool_name: string
  args: Record<string, unknown>
  rule_name: string
  action: EnforcementAction
  message: string
  session_id?: string
}
