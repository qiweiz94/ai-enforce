/** Re-export shim — implementation lives in @ai-enforce/core. */
export {
  initSigning,
  getPublicKeyJwk,
  createSignedEntry,
  verifySignedEntry,
  verifyChain,
  resetHashChain,
  auditLogPath,
} from '@ai-enforce/core'
export type { SigningKey, Signature, SignedEntry, ChainReport } from '@ai-enforce/core'
