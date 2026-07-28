# Enforcement audit — 2026-07-28

A full review of ai-enforce against its own claims, and the fixes that followed.

**Scope of the problem found:** the README stated *"Intercepts EVERY tool call
BEFORE the AI executes it. The AI cannot override this."* The script behind that
sentence returned `allow` for every call, including `rm -rf /`. Around it, four
further paths each independently reduced enforcement to a no-op, and the one
subsystem meant to prove what happened had never written a single record.

Every finding below was reproduced against the built CLI before being fixed, and
each fix landed with a test that fails without it. **119 tests** now pass
(48 core + 71 CLI), up from a suite that could not detect any of these.

---

## 1. The real-time hook allowed everything

`docs/hooks/claude-code-pre-tool-use.sh` parsed the hook payload with:

```bash
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool":"[^"]*"' | ... || echo "unknown")
```

Claude Code sends `tool_name`, `tool_input` and `file_path` — verified directly
against the installed binary, which contains `tool_name` ×75, `tool_input` ×56,
`file_path` ×26 and `hookSpecificOutput` ×40. The literal `"tool":"` never
matches `"tool_name":"`, so the tool was always `unknown` and fell through to:

```bash
else
  # Not a tool we can check — allow it
  echo '{"permissionDecision":"allow"}'
```

Three further fail-open paths, each sufficient alone:

- `if command -v ai-enforce &>/dev/null; then … fi` — binary missing ⇒ allow.
- `RESULT=$(ai-enforce check … 2>&1 || true)` — any crash ⇒ allow.
- `grep -o '"command":"[^"]*"'` truncates at the first escaped quote, so
  `git commit -m "wip" --no-verify` was checked as `git commit -m \` and the
  flag was invisible.

**And the template that installs it was equally broken.**
`"matcher": "Bash(*)"` is the *permissions* grammar, not the matcher's tool-name
regex — and `(*)` is not a valid regex, so the hook would not have fired even
with correct parsing. `Write` was absent despite the script handling it, and
`"timeout": 5000` assumed milliseconds.

**Fixed.** Parsing delegated to node (already a hard dependency), the documented
nested `hookSpecificOutput` envelope emitted, and **every** non-clean path denies.
Matcher corrected to `Bash|Write|Edit|MultiEdit|NotebookEdit|Read`.

> Do not reintroduce an allow-on-error branch in that script. It is the single
> change that turns the file back into a no-op, and it does so silently.

## 2. `init --hooks` made the repo uncommittable

`check --ci` set its violation flag for *every* result, and `evaluate()` emits an
unconditional `edit-before-read` **warning** for any write not preceded by a read
— which, in a one-shot CLI where that set is always empty, is every staged file.
So `--ci` exited 1 always, and `init --hooks` installs exactly that as the
pre-commit hook.

Measured before the fix: `git commit` with one benign staged file → exit 1, zero
commits. Only `block` is a violation now; `warn` and `allow` are not.

## 3. Installing the tool disabled your existing quality gates

`installHook` copied any existing hook to `<name>.ai-enforce-backup` and then
**overwrote** it. The backup was never chained or restored — so a project with a
working pre-commit (lint, tests, secret scanning) silently lost all of it, from
the tool whose stated purpose is stopping agents bypassing quality gates.

Now preserved and chained: the predecessor runs first and **its failure still
fails the commit**. The generated hook's missing-binary path changed from
`exit 0` to `exit 1`.

## 4. Nothing protected the enforcement configuration

The default policy protected `.env`, credentials and `.git/config` — but not
`.ai-enforce.yaml`, `.ai-enforce/`, `.claude/settings.json` or `.git/hooks/`.
An agent could disable every rule by editing one file: exactly the failure mode
the README attributes to prompt-based governance.

Disabling was trivial because `loadPolicy` never failed closed — a corrupted
policy silently reverted to *weaker* defaults, and an **empty** file threw a
TypeError outside the try block, crashing the CLI, which the hook's `|| true`
converted to `allow`.

Now: **absent file ⇒ defaults; present but broken ⇒ fail closed.** Plus a rule
protecting the enforcement configuration itself.

## 5. The evidence trail was decorative

Three independent defects, all invisible at runtime:

- **The hash chain reset every process.** `previousEntryHash` was in-memory in a
  one-shot CLI, so every entry was a genesis entry. A chain where nothing links
  to anything detects no deletion, reordering or truncation. Now seeded from the
  last entry on disk — measured across 4 processes: **1** genesis entry, not 4.
- **Nothing verified.** `verifySignedEntry` had zero callers. New `verifyChain()`
  walks linkage across the whole file; `verify` reports it. Signature checks
  alone only prove *surviving* entries authentic and say nothing about removed
  ones.
- **Not one receipt had ever been written.** `createSign('ed25519')` throws
  `Invalid digest` — Ed25519 is a pure scheme taking no digest name — and
  `audit()`'s best-effort `catch` swallowed it on every call. Separately,
  `getReceiptPublicKey()` never initialised the key, so `verify` reported
  `0/N valid`.

Private keys are now written `0600`; they had been world-readable beside the log
they sign.

## 6. Rules that silently matched nothing

- Globs with a **non-leading** `**` matched nothing: `.` was escaped *after*
  `**` had expanded to `.*`, leaving a literal-dot match. `config/**/*.key`
  protected nothing, and `exclude: ["**/node_modules/**"]` excluded nothing.
- `checkApiKeyExposure` advertised catching `cat .env` but required a secret
  variable *name* in the command string — which `cat .env` has none of. The
  `^(echo|cat|…)` anchor was also defeated by a leading space, `/bin/cat`,
  `less`, `head`, or `foo && cat .env`.
- One invalid regex in a hand-edited policy threw out of `evaluate()` and
  disabled **all** enforcement, while the content-rule path right below already
  guarded its own compile.
- A blocked command exited **0**, so any wrapper keying on status saw success.

## 7. Two engines, neither both shipped and tested

`packages/cli` carried a 766-line fork of `packages/core`'s engine. Security
fixes landed in the CLI copy; core held the repo's only tests. The two drifted —
core's rules were weaker.

Converged onto core, verified by identity (`core.PolicyEngine` is the same class
object the CLI ships), not by inspection.

> **Honest caveat:** those 48 legacy tests passed *unchanged* against both the
> stale and merged engines. They cover the subset that never diverged; they did
> not detect the drift and would not have. `convergence.test.ts` is what pins the
> fixes and fails if a local copy reappears.

`packages/mcp-server` was published but excluded from `workspaces`, so `npm ci`
skipped it and its dependency could not resolve — it could not be built at all.
Now a workspace member.

---

## Things that were fine

Recorded so this reads as an audit, not a list of complaints: the Rego/WASM
engine, the ATR rule import, the tool-poisoning and DLP scanning in the gateway,
and the reasoning-trace analysis were all sound. `packages/cli/src/mcp/server.ts`
was a thin wrapper on the engine, not a third fork.

## A correction to this audit's own first draft

An earlier version claimed `rm -fr /`, leading-space `rm -rf /`,
`/usr/bin/sudo …` and `git commit -n` all bypassed enforcement. **They do not.**
That analysis read the policy regexes in isolation and missed the hardcoded
guards layered on top in `check.ts`. Measured against the built CLI, all four
block. One real bypass existed — `git commit -m x -n`, because the short flag had
to sit adjacent to `commit` — and it is fixed and tested.

## Verifying any of this yourself

```bash
npm ci && npm run build && npm test

# the hook, end to end
printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' \
  | bash docs/hooks/claude-code-pre-tool-use.sh      # -> deny

# fail-closed with no binary on PATH
printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"ls"}}' \
  | env PATH=/usr/bin:/bin bash docs/hooks/claude-code-pre-tool-use.sh   # -> deny

# the evidence chain, across separate processes
ai-enforce init && for i in 1 2 3; do ai-enforce check --command "rm -rf /"; done
ai-enforce verify                                     # -> chain: intact
sed -i '' '2d' .ai-enforce/audit.log
ai-enforce verify                                     # -> chain: BROKEN
```

## Still open

- `signing.ts` and `receipts.ts` remain two implementations of one idea. The
  chain defect is fixed in both; converging them is a refactor, not a bug fix.
- The signing key still lives beside the log it signs. `0600` narrows this;
  anyone who can write the log as the same user can still re-sign.
- The gateway enforces `tools/call` and `resources/read`. Other MCP methods are
  forwarded; extending coverage means adding a case, not widening the fallthrough.
- **Release ordering:** `ai-enforce` now depends on `@ai-enforce/core`, which is
  not yet on npm. `scripts/publish.sh` publishes core first, so the order is
  right — but core must land before or with the next `ai-enforce` release.
