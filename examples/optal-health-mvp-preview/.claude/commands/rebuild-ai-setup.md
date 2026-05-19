---
description: Wipe .claude/ and regenerate from scratch. Destructive — use with care.
allowed-tools: "Bash(rm:*), Bash(npx my-claude-team:*), Bash(my-claude-team:*)"
---

# /rebuild-ai-setup

**Destructive.** Removes every file in `.claude/` (except `settings.local.json`) and regenerates them from the current repo profile.

Before running:
1. Confirm there are no uncommitted edits in `.claude/` that you want to keep.
2. Read the output of `/analyze-repo` — make sure the framework sees your repo correctly.

Then:

```bash
rm -rf .claude/agents .claude/skills .claude/commands .claude/INDEX.md CLAUDE.md
npx my-claude-team generate all --force
```

For a non-destructive refresh, use `/create-my-claude-team-member` instead.
