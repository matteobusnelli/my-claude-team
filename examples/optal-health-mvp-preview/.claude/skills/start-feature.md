---
name: start-feature
description: "Bootstrap a docs/plans/<slug>/ directory for a non-trivial feature. Plan only — no code."
---

# Start a feature (plan stage)

Path B step 1. Output is a plan directory, not code.

## Procedure

1. **Parse the brief** — name, scope, success criteria, out-of-scope items.
2. **Skim the affected code** — list the files/modules involved. Don't open >20.
3. **Bootstrap** `docs/plans/<slug>/` (kebab-case slug):
   - `plan.md` — problem, approach, phases, risks, out-of-scope.
   - `backlog.md` — ordered user stories with acceptance criteria.
   - `summary.md` — one-paragraph TL;DR (kept current as the work progresses).
4. **Stop.** Wait for user approval before any implementation.

## Don't

- Don't write code. Don't write tests. Just plan.
- Don't list every possible edge case. List the ones that change the design.
- Don't propose more than 3 phases. If you need 5, the feature is too big — propose splitting.
