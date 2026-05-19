---
description: Print the detected repository profile (stack, layout, conventions, compliance signals).
allowed-tools: "Bash(npx my-claude-team:*), Bash(my-claude-team:*)"
---

# /analyze-repo

Prints the detected `RepoProfile` for this repository. Useful to understand what the framework sees before regenerating.

```bash
npx my-claude-team scan
```

For machine-readable output:

```bash
npx my-claude-team scan --json
```
