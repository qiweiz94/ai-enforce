# GitHub Copilot Integration

## Via Git Hooks

```bash
cd your-project
ai-enforce init --hooks
```

GitHub Copilot's agent mode generates code that goes through your normal git workflow. The pre-commit hooks catch any violations before code is committed.

## Via GitHub Action

Add to your `.github/workflows/ai-enforce.yml`:

```yaml
name: AI Enforce
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Enforce Check
        uses: nanoclaw/ai-enforce-action@v1
```

This checks every PR for policy violations in the diff.
