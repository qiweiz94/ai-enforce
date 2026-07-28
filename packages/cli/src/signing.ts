/**
 * Ed25519 signing module for tamper-evident audit entries.
 * Based on patterns from DashClaw and Pipelock.
 * Uses Node.js built-in crypto (zero external dependencies).
 */

import {
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
  createHash,
  randomUUID,
} from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export interface SigningKey {
  kid: string
  privateKeyJwk: object
  publicKeyJwk: object
}

export interface Signature {
  alg: 'EdDSA'
  kid: string
  sig: string // base64url-encoded
}

export interface SignedEntry {
  version: string
  id: string
  timestamp: string
  action: string
  rule_name: string
  message: string
  tool_name?: string
  args?: Record<string, unknown>
  previousEntryHash: string | null
  signature?: Signature
}

let currentKey: SigningKey | null = null
const sessionHashChains = new Map<string, string | null>()

export function initSigning(): SigningKey {
  if (currentKey) return currentKey

  // Check for env var override first
  const envKey = process.env.AI_ENFORCE_SIGNING_KEY_JWK
  if (envKey) {
    try {
      const parsed = JSON.parse(envKey) as SigningKey
      currentKey = parsed
      return parsed
    } catch { /* fall through to disk or generate */ }
  }

  // Try loading from disk (persisted across sessions)
  const keyDir = join(process.cwd(), '.ai-enforce')
  const keyPath = join(keyDir, 'signing-key.json')
  if (existsSync(keyPath)) {
    try {
      const stored = JSON.parse(readFileSync(keyPath, 'utf-8')) as SigningKey
      currentKey = stored
      return stored
    } catch { /* fall through to generate */ }
  }

  // Generate a new Ed25519 key pair
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  })

  const privateJwk = createPrivateKey({ key: privateKey, format: 'der', type: 'pkcs8' })
    .export({ format: 'jwk' })
  const publicJwk = createPublicKey({ key: publicKey, format: 'der', type: 'spki' })
    .export({ format: 'jwk' })

  // Compute kid as RFC 7638 JWK thumbprint
  const thumbprintInput = JSON.stringify({ crv: 'Ed25519', kty: 'OKP', x: (publicJwk as any).x })
  const kid = createHash('sha256').update(thumbprintInput).digest('base64url')

  currentKey = {
    kid,
    privateKeyJwk: { ...privateJwk, kid } as any,
    publicKeyJwk: { ...publicJwk, kid } as any,
  }

  // Persist to disk so signatures can be verified across sessions
  try {
    if (!existsSync(keyDir)) mkdirSync(keyDir, { recursive: true })
    writeFileSync(keyPath, JSON.stringify(currentKey, null, 2))
  } catch { /* best-effort persistence */ }

  return currentKey
}

export function getPublicKeyJwk(): object {
  if (!currentKey) initSigning()
  return currentKey!.publicKeyJwk
}

function canonicalizeJson(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v).sort().reduce((acc, key) => {
        acc[key] = v[key]
        return acc
      }, {} as Record<string, unknown>)
    }
    return v
  })
}

export function createSignedEntry(
  entry: Omit<SignedEntry, 'version' | 'id' | 'signature' | 'previousEntryHash' | 'timestamp'>,
  sessionName?: string
): SignedEntry {
  const key = currentKey || initSigning()
  const session = sessionName || process.env.AI_ENFORCE_SESSION_ID || 'default'
  if (!sessionHashChains.has(session)) sessionHashChains.set(session, null)

  const signedEntry: SignedEntry = {
    version: 'audit-entry/v1',
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    previousEntryHash: sessionHashChains.get(session)!,
    ...entry,
  }

  // Sign the entry (without the signature field)
  const { signature: _, ...toSign } = signedEntry
  const canonical = canonicalizeJson(toSign)
  const input = Buffer.from(canonical, 'utf8')
  const privateKey = createPrivateKey({ key: key.privateKeyJwk as any, format: 'jwk' })
  const sig = sign(null, input, privateKey)

  signedEntry.signature = {
    alg: 'EdDSA',
    kid: key.kid,
    sig: sig.toString('base64url'),
  }

  // Update hash chain (per-session)
  const entryHash = createHash('sha256').update(canonical).digest('hex')
  sessionHashChains.set(session, entryHash)

  return signedEntry
}

export function verifySignedEntry(entry: SignedEntry, publicKeyJwk: object): boolean {
  try {
    const { signature, ...toVerify } = entry
    if (!signature) return false

    const canonical = canonicalizeJson(toVerify)
    const input = Buffer.from(canonical, 'utf8')
    const publicKey = createPublicKey({ key: publicKeyJwk as any, format: 'jwk' })

    return verify(null, input, publicKey, Buffer.from(signature.sig, 'base64url'))
  } catch {
    return false
  }
}

export function resetHashChain(sessionName?: string): void {
  const session = sessionName || process.env.AI_ENFORCE_SESSION_ID || 'default'
  sessionHashChains.set(session, null)
}
