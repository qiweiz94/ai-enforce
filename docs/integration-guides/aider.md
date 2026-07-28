# Aider Integration

Aider works directly with git, so ai-enforce's pre-commit and pre-push hooks provide enforcement:

```bash
cd your-project
ai-enforce init --hooks
```

When Aider attempts to commit changes that violate policy:

1. The pre-commit hook runs and blocks the commit
2. Aider receives the error and shows it to you
3. The violation is logged to the audit trail

Aider also supports an architect mode which can be configured to consult ai-enforce before writing code.
