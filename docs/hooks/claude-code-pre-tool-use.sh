#!/bin/bash
# Claude Code PreToolUse hook for ai-enforce.
#
# Intercepts tool calls BEFORE Claude Code executes them and returns an
# explicit allow/deny decision.
#
# Install: bash docs/hooks/claude-code-setup.sh
#
# Contract (must match Claude Code's actual wire format):
#   INPUT  (stdin):  {"hook_event_name":"PreToolUse","tool_name":"Bash",
#                     "tool_input":{"command":"..."}}
#                    File tools use tool_input.file_path.
#   OUTPUT (stdout): {"hookSpecificOutput":{"hookEventName":"PreToolUse",
#                     "permissionDecision":"allow"|"deny",
#                     "permissionDecisionReason":"..."}}
#
# FAIL-CLOSED BY CONSTRUCTION. "allow" is emitted only when a policy
# evaluation actually ran and returned clean. A missing binary, an
# unparseable payload, a crashed evaluation, or an empty response all
# produce "deny". Do not add an allow-on-error path here — that is the
# single change that would silently turn this file back into a no-op.
#
# Payload parsing is delegated to node (already a hard dependency of the
# CLI) rather than grep: a command containing an escaped quote, e.g.
#   git commit -m "wip" --no-verify
# truncates under `grep -o '"command":"[^"]*"'` and the flag becomes
# invisible to the policy check.

set -uo pipefail

DENY_UNAVAILABLE='{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"ai-enforce: enforcement unavailable — denying by default"}}'

INPUT=$(cat)

OUTPUT=$(printf '%s' "$INPUT" | node -e '
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

function respond(decision, reason) {
  const hookSpecificOutput = {
    hookEventName: "PreToolUse",
    permissionDecision: decision,
  };
  if (reason) hookSpecificOutput.permissionDecisionReason = "ai-enforce: " + reason;
  process.stdout.write(JSON.stringify({ hookSpecificOutput }));
  process.exit(0);
}

let ev;
try {
  ev = JSON.parse(fs.readFileSync(0, "utf8"));
} catch (e) {
  respond("deny", "unparseable PreToolUse payload");
}

const tool = ev.tool_name || "";
const ti = ev.tool_input || {};
let args = null;

if (tool === "Bash") {
  const cmd = typeof ti.command === "string" ? ti.command : "";
  if (cmd) args = ["check", "--command", cmd];
} else if (tool === "Write" || tool === "Edit" || tool === "MultiEdit") {
  const p = ti.file_path || ti.path || "";
  // --write: a file_rule can permit reads while blocking writes, so the
  // question being asked has to match the action being taken.
  if (p) args = ["check", "--file", p, "--write"];
} else if (tool === "NotebookEdit") {
  const p = ti.notebook_path || ti.file_path || "";
  if (p) args = ["check", "--file", p, "--write"];
} else if (tool === "Read") {
  const p = ti.file_path || "";
  if (p) args = ["check", "--file", p];
}

// Tools this hook does not police (Glob, Grep, WebFetch, MCP tools, ...).
// Extending coverage belongs in the policy engine, not this dispatcher.
if (!args) respond("allow");

try {
  execFileSync("ai-enforce", args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    timeout: 10000,
  });
  respond("allow");
} catch (err) {
  // Distinguish "policy said no" (non-zero exit) from "could not evaluate".
  if (!err || typeof err.status !== "number") {
    respond("deny", "enforcement could not run (" + ((err && err.code) || "unknown") + ")");
  }
  const out = String(err.stdout || "") + String(err.stderr || "");
  const line = out.split("\n").find((l) => l.includes("BLOCKED"));
  const reason = line
    ? line.replace(/.*\[BLOCKED\]\s*/, "").replace(/\s*\(rule:.*$/, "").trim()
    : "blocked by policy";
  respond("deny", reason);
}
' 2>/dev/null)

# Any failure to produce a well-formed decision denies.
if [ -z "$OUTPUT" ]; then
  printf '%s' "$DENY_UNAVAILABLE"
  exit 0
fi

printf '%s' "$OUTPUT"
exit 0
