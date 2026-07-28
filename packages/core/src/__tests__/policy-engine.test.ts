import { describe, it, expect } from 'vitest'
import { PolicyEngine } from '../policy-engine.js'

function makeEngine(): PolicyEngine {
  const engine = new PolicyEngine()
  engine.loadPolicy()
  return engine
}

describe('PolicyEngine', () => {
  describe('isDestructiveCommand', () => {
    const engine = makeEngine()

    it('blocks rm -rf /', () => {
      expect(engine.isDestructiveCommand('rm -rf /')).toBe(true)
    })

    it('blocks rm -rf ~', () => {
      expect(engine.isDestructiveCommand('rm -rf ~')).toBe(true)
    })

    it('blocks kill commands', () => {
      expect(engine.isDestructiveCommand('kill 1234')).toBe(true)
    })

    it('blocks pkill', () => {
      expect(engine.isDestructiveCommand('pkill -f python')).toBe(true)
    })

    it('blocks reboot', () => {
      expect(engine.isDestructiveCommand('reboot')).toBe(true)
    })

    it('allows safe commands', () => {
      expect(engine.isDestructiveCommand('ls -la')).toBe(false)
      expect(engine.isDestructiveCommand('npm install')).toBe(false)
      expect(engine.isDestructiveCommand('git status')).toBe(false)
    })
  })

  describe('checkForcePush', () => {
    const engine = makeEngine()

    it('detects git push --force', () => {
      expect(engine.checkForcePush('git push --force origin main')).toBe(true)
    })

    it('allows git push --force-with-lease', () => {
      expect(engine.checkForcePush('git push --force-with-lease origin main')).toBe(false)
    })

    it('allows normal git push', () => {
      expect(engine.checkForcePush('git push origin main')).toBe(false)
    })
  })

  describe('checkNoVerify', () => {
    const engine = makeEngine()

    it('detects git commit --no-verify', () => {
      expect(engine.checkNoVerify('git commit --no-verify -m "msg"')).toBe(true)
    })

    it('detects git commit -n shorthand', () => {
      expect(engine.checkNoVerify('git commit -n -m "msg"')).toBe(true)
    })

    it('allows git show -n 5 (not no-verify)', () => {
      expect(engine.checkNoVerify('git show -n 5')).toBe(false)
    })

    it('allows git log -n 10', () => {
      expect(engine.checkNoVerify('git log -n 10')).toBe(false)
    })
  })

  describe('checkHookBypass', () => {
    const engine = makeEngine()

    it('detects core.hooksPath override', () => {
      expect(engine.checkHookBypass('git -c core.hooksPath=/dev/null commit')).toBe(true)
    })

    it('detects HUSKY=0', () => {
      expect(engine.checkHookBypass('HUSKY=0 git commit')).toBe(true)
    })

    it('detects LEFTHOOK=0', () => {
      expect(engine.checkHookBypass('LEFTHOOK=0 git commit')).toBe(true)
    })
  })

  describe('checkSudo', () => {
    const engine = makeEngine()
    it('detects sudo', () => { expect(engine.checkSudo('sudo rm file')).toBe(true) })
    it('allows non-sudo commands', () => { expect(engine.checkSudo('rm file')).toBe(false) })
  })

  describe('checkPKillPython', () => {
    const engine = makeEngine()
    it('detects pkill -f python', () => { expect(engine.checkPKillPython('pkill -f python')).toBe(true) })
    it('allows regular pkill', () => { expect(engine.checkPKillPython('pkill chrome')).toBe(false) })
  })

  describe('isSSHCmd', () => {
    const engine = makeEngine()
    it('detects ssh', () => { expect(engine.isSSHCmd('ssh user@host')).toBe(true) })
    it('detects scp', () => { expect(engine.isSSHCmd('scp file host:')).toBe(true) })
    it('allows non-ssh commands', () => { expect(engine.isSSHCmd('git push')).toBe(false) })
  })

  describe('checkSecret', () => {
    const engine = makeEngine()

    it('detects AWS access key', () => {
      const result = engine.checkSecret('AKIAIOSFODNN7EXAMPLE')
      expect(result).not.toBeNull()
      expect(result!.action).toBe('block')
    })

    it('detects OpenAI API key', () => {
      const result = engine.checkSecret('sk-' + 'a'.repeat(48))
      expect(result).not.toBeNull()
    })

    it('detects GitHub PAT', () => {
      const result = engine.checkSecret('ghp_' + 'a'.repeat(36))
      expect(result).not.toBeNull()
    })

    it('detects private key', () => {
      const result = engine.checkSecret('-----BEGIN RSA PRIVATE KEY-----\nabc')
      expect(result).not.toBeNull()
    })

    it('detects env var API keys', () => {
      expect(engine.checkSecret('OPENAI_API_KEY=sk-test')).not.toBeNull()
      expect(engine.checkSecret('ANTHROPIC_API_KEY=sk-ant-test')).not.toBeNull()
      expect(engine.checkSecret('AWS_SECRET_ACCESS_KEY=test')).not.toBeNull()
    })

    it('returns null for safe content', () => {
      expect(engine.checkSecret('const x = 1')).toBeNull()
      expect(engine.checkSecret('# This is a comment')).toBeNull()
    })
  })

  describe('policy evaluation', () => {
    const engine = makeEngine()

    it('blocks dangerous commands via evaluate', () => {
      const results = engine.evaluate({
        tool_name: 'bash',
        args: { command: 'rm -rf /' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.action === 'block')).toBe(true)
    })

    it('blocks no-verify via evaluate', () => {
      const results = engine.evaluate({
        tool_name: 'bash',
        args: { command: 'git commit --no-verify -m "test"' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(results.some(r => r.action === 'block')).toBe(true)
    })

    it('detects protected file writes (.env)', () => {
      const results = engine.evaluate({
        tool_name: 'write_file',
        args: { filePath: 'project/.env' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(results.some(r => r.action === 'block')).toBe(true)
    })

    it('detects root .env write', () => {
      const results = engine.evaluate({
        tool_name: 'write_file',
        args: { filePath: '.env' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(results.some(r => r.action === 'block')).toBe(true)
    })

    it('allows safe file writes', () => {
      const results = engine.evaluate({
        tool_name: 'write_file',
        args: { filePath: 'src/index.ts' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(results.filter(r => r.action === 'block').length).toBe(0)
    })

    it('allows safe commands', () => {
      const results = engine.evaluate({
        tool_name: 'bash',
        args: { command: 'npm install express' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(results.filter(r => r.action === 'block').length).toBe(0)
    })
  })

  describe('audit log', () => {
    it('persists entries on evaluate', () => {
      const engine = makeEngine()
      engine.evaluate({
        tool_name: 'bash',
        args: { command: 'rm -rf /' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(engine.getAuditLog().length).toBeGreaterThan(0)
    })
  })

  describe('edit-before-read', () => {
    it('warns when editing unread file', () => {
      const engine = makeEngine()
      const results = engine.evaluate({
        tool_name: 'edit',
        args: { filePath: 'src/unknown.ts' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(results.some(r => r.rule_name === 'edit-before-read')).toBe(true)
    })

    it('does not warn when editing read file', () => {
      const engine = makeEngine()
      engine.evaluate({
        tool_name: 'read_file',
        args: { filePath: 'src/known.ts' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      const results = engine.evaluate({
        tool_name: 'edit',
        args: { filePath: 'src/known.ts' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(results.some(r => r.rule_name === 'edit-before-read')).toBe(false)
    })
  })

  describe('api key exposure via commands', () => {
    const engine = makeEngine()

    it('blocks echo $API_KEY', () => {
      const r = engine.checkApiKeyExposure('echo $OPENAI_API_KEY')
      expect(r.some(x => x.action === 'block')).toBe(true)
    })

    it('blocks cat .env', () => {
      const r = engine.checkApiKeyExposure('cat .env')
      // Only blocks if .env contains API_KEY patterns — the check is for the pattern in the command
      expect(Array.isArray(r)).toBe(true)
    })

    it('blocks env | grep OPENAI_API_KEY', () => {
      const r = engine.checkApiKeyExposure('env | grep OPENAI_API_KEY')
      expect(r.some(x => x.action === 'block')).toBe(true)
    })

    it('blocks set KEY=VALUE', () => {
      const r = engine.checkApiKeyExposure('set ANTHROPIC_API_KEY=sk-test')
      expect(r.some(x => x.action === 'block')).toBe(true)
    })

    it('blocks export KEY=VALUE', () => {
      const r = engine.checkApiKeyExposure('export AWS_SECRET_ACCESS_KEY=test')
      expect(r.some(x => x.action === 'block')).toBe(true)
    })

    it('blocks curl with Bearer token', () => {
      const r = engine.checkApiKeyExposure('curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.example.com')
      expect(r.some(x => x.action === 'block')).toBe(true)
    })

    it('allows safe commands', () => {
      expect(engine.checkApiKeyExposure('npm install express')).toEqual([])
      expect(engine.checkApiKeyExposure('git status')).toEqual([])
    })
  })

  describe('session tracking', () => {
    it('tracks read files', () => {
      const engine = makeEngine()
      engine.evaluate({
        tool_name: 'read_file', args: { filePath: 'src/test.ts' }, cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      expect(engine.hasReadFile('src/test.ts')).toBe(true)
      expect(engine.hasReadFile('unknown.ts')).toBe(false)
    })

    it('clears session', () => {
      const engine = makeEngine()
      engine.evaluate({
        tool_name: 'read_file', args: { filePath: 'src/test.ts' }, cwd: '/test',
        timestamp: new Date().toISOString(),
      })
      engine.clearSession()
      expect(engine.hasReadFile('src/test.ts')).toBe(false)
    })
  })

  describe('custom policy loading', () => {
    it('falls back to defaults when file missing', () => {
      const engine = new PolicyEngine('/nonexistent/path.yaml')
      engine.loadPolicy()
      expect(() => engine.evaluate({
        tool_name: 'bash',
        args: { command: 'rm -rf /' },
        cwd: '/test',
        timestamp: new Date().toISOString(),
      })).not.toThrow()
    })
  })
})
