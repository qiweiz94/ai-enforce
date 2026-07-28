/**
 * Signed Action Receipts — offline-verifiable evidence trail.
 *
 * Every policy decision emits a cryptographically signed receipt that can be
 * verified independently, without access to the original system.
 *
 * Inspired by Pipelock (signed egress receipts), Emilia Protocol (IETF draft),
 * and Assay (bounded-claim evidence). These projects have converged on the
 * same pattern: Ed25519-signed, hash-chained, offline-verifiable evidence.
 *
 * Key properties:
 *   - Ed25519 signed (verifiable with only the public key)
 *   - Hash-chained (each receipt links to the previous)
 *   - Tamper-evident (any modification invalidates the signature)
 *   - Offline-verifiable (no API call needed to verify)
 *   - Public verification endpoint (/.well-known/jwks.json)
 */

import {
  createSign, createVerify, generateKeyPairSync, createPrivateKey, createPublicKey,
  createHash, randomUUID,
} from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

// ===== Key Management =====

let signingKey: { kid: string; privateJwk: object; publicJwk: object } | null = null

export function initReceiptKey(): { kid: string; privateJwk: object; publicJwk: object } {
  if (signingKey) return signingKey

  // Try loading existing key from env or disk
  const envKey = process.env.AI_ENFORCE_RECEIPT_KEY
  if (envKey) {
    try {
      const parsed = JSON.parse(envKey) as { kid: string; privateJwk: object; publicJwk: object }
      if (parsed && parsed.kid) { signingKey = parsed; return parsed }
    } catch { /* fall through */ }
  }

  const keyDir = join(process.cwd(), '.ai-enforce')
  const keyPath = join(keyDir, 'receipt-key.json')
  if (existsSync(keyPath)) {
    try {
      const parsed = JSON.parse(readFileSync(keyPath, 'utf-8')) as { kid: string; privateJwk: object; publicJwk: object }
      if (parsed && parsed.kid) { signingKey = parsed; return parsed }
    } catch { /* fall through */ }
  }

  // Generate
  const kp = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  })
  const privJwk = createPrivateKey({ key: kp.privateKey, format: 'der', type: 'pkcs8' }).export({ format: 'jwk' })
  const pubJwk = createPublicKey({ key: kp.publicKey, format: 'der', type: 'spki' }).export({ format: 'jwk' })
  const kid = createHash('sha256').update(JSON.stringify({ crv: 'Ed25519', kty: 'OKP', x: (pubJwk as any).x })).digest('base64url')

  const newKey = { kid, privateJwk: privJwk, publicJwk: { ...pubJwk, kid } }
  signingKey = newKey
  try {
    if (!existsSync(keyDir)) mkdirSync(keyDir, { recursive: true })
    writeFileSync(keyPath, JSON.stringify(newKey))
  } catch { /* best effort */ }

  return signingKey!
}

export function getReceiptPublicKey(): object | null {
  return signingKey?.publicJwk || null
}

// ===== Receipt Types =====

export interface ActionReceipt {
  version: string
  id: string
  timestamp: string
  agent_id: string
  action: { tool: string; args_hash: string }
  decision: { verdict: string; rule_name: string; policy_name: string }
  previous_receipt_hash: string | null
  receipt_hash: string
  signature?: string
}

// ===== Receipt Creation =====

const receiptChain = new Map<string, string | null>()

export function createReceipt(
  agentId: string,
  toolName: string,
  args: Record<string, unknown>,
  verdict: string,
  ruleName: string,
  policyName: string,
  sessionName?: string
): ActionReceipt {
  initReceiptKey()
  const session = sessionName || process.env.AI_ENFORCE_SESSION_ID || 'default'
  if (!receiptChain.has(session)) receiptChain.set(session, null)

  const argsHash = createHash('sha256').update(JSON.stringify(args)).digest('hex')

  const receipt: ActionReceipt = {
    version: 'action-receipt/v1',
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    agent_id: agentId,
    action: { tool: toolName, args_hash: argsHash },
    decision: { verdict, rule_name: ruleName, policy_name: policyName },
    previous_receipt_hash: receiptChain.get(session)!,
    receipt_hash: '',
  }

  // Compute receipt hash (over all fields except signature and receipt_hash)
  const { receipt_hash: _, signature: _s, ...toHash } = receipt
  receipt.receipt_hash = createHash('sha256').update(JSON.stringify(toHash)).digest('hex')

  // Sign
  const key = signingKey!
  const signer = createSign('ed25519')
  signer.update(JSON.stringify(toHash))
  signer.end()
  receipt.signature = signer.sign({ key: key.privateJwk as any, format: 'jwk' }).toString('base64url')

  // Update chain
  receiptChain.set(session, receipt.receipt_hash)

  // Persist
  try {
    const dir = join(process.cwd(), '.ai-enforce', 'receipts')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, 'receipts.log'), JSON.stringify(receipt) + '\n')
  } catch { /* best effort */ }

  return receipt
}

// ===== Receipt Verification =====

export function verifyReceipt(receipt: ActionReceipt, publicKeyJwk?: object): { ok: boolean; reason?: string } {
  const key = publicKeyJwk || getReceiptPublicKey()
  if (!key) return { ok: false, reason: 'No public key available' }

  const { signature, receipt_hash, ...toVerify } = receipt

  if (!signature) return { ok: false, reason: 'No signature' }

  // Verify receipt hash integrity
  const expectedHash = createHash('sha256').update(JSON.stringify(toVerify)).digest('hex')
  if (expectedHash !== receipt_hash) {
    return { ok: false, reason: 'Receipt hash mismatch — content has been tampered with' }
  }

  // Verify Ed25519 signature
  const verifier = createVerify('ed25519')
  verifier.update(JSON.stringify(toVerify))
  verifier.end()
  const valid = verifier.verify({ key: key as any, format: 'jwk' }, Buffer.from(signature, 'base64url'))

  return valid
    ? { ok: true }
    : { ok: false, reason: 'Signature invalid — receipt has been tampered with' }
}

export function verifyReceiptFromJson(jsonString: string, publicKeyJwk?: object): { ok: boolean; reason?: string } {
  try {
    const receipt = JSON.parse(jsonString) as ActionReceipt
    return verifyReceipt(receipt, publicKeyJwk)
  } catch (err) {
    return { ok: false, reason: `Parse error: ${err}` }
  }
}
