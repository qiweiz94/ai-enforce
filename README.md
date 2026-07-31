# ai-enforce — ARCHIVED

> **This project has been superseded by [Keel](https://github.com/qiweiz94/keel).**
>
> Keel enforces rules on AI coding agents **outside** the agent's context window —
> rules that survive context rot, compaction, and agent amnesia. It ships an
> OpenCode plugin (3 hooks), Claude Code hooks, a CLI (`keel-cli` on npm), and a
> self-improvement loop (`keel gather`, `keel schedule`).
>
> ```bash
> npm install -g keel-cli
> keel install --opencode
> ```
>
> This repository is archived for reference only. No further development happens here.
> The npm package `ai-enforce` is deprecated — install `keel-cli` instead.

---

## Historical (pre-archive)

The original implementation: pre-commit hooks for AI coding assistants, enforcing
policies across Cline, Claude Code, Cursor, and Copilot. Superseded by Keel's
in-process enforcement (which cannot be bypassed by the model).
