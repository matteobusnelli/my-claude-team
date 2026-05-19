---
description: Production-risk review of the current branch or a PR.
allowed-tools: "Bash(git diff:*), Bash(git log:*), Bash(gh pr view:*), Bash(gh pr diff:*), Read, Grep, Glob"
---

# /incident-review

Load `.claude/skills/incident-review.md` and audit the current branch (or the PR named in `$ARGUMENTS`) against every risk category.

```bash
# Current branch
git diff main...HEAD

# Specific PR
gh pr diff <PR#>
```
