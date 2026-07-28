/**
 * Behavioral Anomaly Detection — 4 dimensions.
 *
 * Based on Aegis's 9-dimensional anomaly detection system, simplified to the
 * 4 highest-signal dimensions that can be implemented with pure statistical
 * methods (no ML libraries needed).
 *
 * Dimensions:
 *   1. Tool novelty — agent uses a tool it has never called before
 *   2. Frequency spike — sudden burst of calls (3x historical mean)
 *   3. Argument length — unusually large payloads (mean + 3*stddev)
 *   4. Sequence anomaly — unexpected tool ordering (e.g., delete without read)
 */

import chalk from 'chalk'

interface AgentProfile {
  seenTools: Set<string>
  callTimestamps: number[]
  argLengths: Map<string, number[]>
  toolSequences: string[]
}

const profiles = new Map<string, AgentProfile>()

function getOrCreateProfile(agentId: string): AgentProfile {
  if (!profiles.has(agentId)) {
    profiles.set(agentId, {
      seenTools: new Set(),
      callTimestamps: [],
      argLengths: new Map(),
      toolSequences: [],
    })
  }
  return profiles.get(agentId)!
}

export interface AnomalyResult {
  anomalous: boolean
  confidence: number
  reasons: string[]
}

/**
 * Evaluate an action against the agent's behavioral profile.
 * Returns anomaly results if any dimension triggers.
 */
export function checkAnomaly(
  agentId: string,
  toolName: string,
  args: Record<string, unknown>
): AnomalyResult | null {
  const profile = getOrCreateProfile(agentId)
  const reasons: string[] = []
  const now = Date.now()

  // Dimension 1: Tool novelty — first use of any tool
  if (!profile.seenTools.has(toolName)) {
    profile.seenTools.add(toolName)
    if (profile.seenTools.size > 1) {
      // Only flag if NOT the very first tool call (that's always "new")
      reasons.push('tool-novelty')
    }
  }

  // Dimension 2: Frequency spike — 3x historical mean in 60s window
  profile.callTimestamps.push(now)
  const oneMinuteAgo = now - 60000
  const recentCalls = profile.callTimestamps.filter(t => t > oneMinuteAgo)
  if (profile.callTimestamps.length > 5) {
    const totalTime = profile.callTimestamps[profile.callTimestamps.length - 1] - profile.callTimestamps[0]
    const historicalRate = totalTime > 0 ? (profile.callTimestamps.length / totalTime) * 60000 : 0
    const currentRate = recentCalls.length
    if (historicalRate > 0 && currentRate > historicalRate * 3 && currentRate > 5) {
      reasons.push('frequency-spike')
    }
  }

  // Dimension 3: Argument length outlier — mean + 3*stddev
  const argStr = JSON.stringify(args)
  const argLen = argStr.length
  if (argLen > 100) {
    const lens = profile.argLengths.get(toolName) || []
    lens.push(argLen)
    profile.argLengths.set(toolName, lens)

    if (lens.length > 5) {
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length
      const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length
      const stddev = Math.sqrt(variance)
      if (stddev > 0 && argLen > mean + 3 * stddev) {
        reasons.push('argument-length-outlier')
      }
    }
  }

  // Dimension 4: Sequence anomaly — dangerous operations without prior read
  const DANGEROUS_TOOLS = new Set(['delete', 'drop', 'truncate', 'remove', 'destroy', 'purge'])
  const READ_TOOLS = new Set(['read', 'list', 'get', 'select', 'query', 'search', 'find'])

  profile.toolSequences.push(toolName)
  if (DANGEROUS_TOOLS.has(toolName) && profile.toolSequences.length > 1) {
    const previousTool = profile.toolSequences[profile.toolSequences.length - 2]
    if (!READ_TOOLS.has(previousTool)) {
      reasons.push('sequence-anomaly')
    }
  }

  if (reasons.length === 0) return null

  const confidence = Math.min(1, reasons.length * 0.25)
  return { anomalous: true, confidence, reasons }
}

export function printAnomaly(result: AnomalyResult): void {
  const confidenceStr = (result.confidence * 100).toFixed(0)
  console.log(chalk.yellow(`⚠ [ANOMALY] Behavioral anomaly detected (confidence: ${confidenceStr}%)`))
  for (const reason of result.reasons) {
    const desc = reason === 'tool-novelty' ? 'New tool used for the first time' :
      reason === 'frequency-spike' ? 'Call frequency spike (3x historical rate)' :
      reason === 'argument-length-outlier' ? 'Unusually large argument payload' :
      reason === 'sequence-anomaly' ? 'Dangerous action without prior read' :
      reason
    console.log(`  - ${desc}`)
  }
}
