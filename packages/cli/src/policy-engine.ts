/**
 * Re-export shim. The engine lives in @ai-enforce/core.
 *
 * This file was previously a 766-line fork of core's engine. The two drifted —
 * every security fix landed here and never in core, while core held the repo's
 * only test suite. Whichever copy you fixed, the other stayed wrong and the
 * tests covered neither the shipped one nor the drift. One implementation now.
 */
export {
  PolicyEngine,
  DEFAULT_POLICY,
  DEFAULT_POLICY_YAML,
  SECRET_ENV_PATTERNS,
} from '@ai-enforce/core'
