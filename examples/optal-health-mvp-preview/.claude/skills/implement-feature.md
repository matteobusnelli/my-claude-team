---
name: implement-feature
description: Phased full-stack orchestrator. Use after the plan is approved. Delegates to layer skills.
---

# Implement a feature (full stack)

Path B step 3. The plan dir at `docs/plans/<slug>/` is the contract.

## Phases (each is a gate — don't proceed if it fails)

1. **Understand** — re-read `docs/plans/<slug>/plan.md`. If it's stale, stop and ask.
2. **Schema** — prisma changes first; generate migration; rebuild local DB; gate: schema tests pass.
3. **Backend** — delegate to `create-api-feature` per endpoint; gate: `pnpm test` passes.
4. **Frontend** — delegate to `create-web-page` per route; gate: `pnpm typecheck`.
5. **Verify** — full pipeline.
6. **Report** — diff summary, what was tested, anything left open.

## Key rules

- **One PR, one plan.** Don't merge mid-plan unless explicitly scoped.
- **Don't skip auth flows.** If the feature introduces a new role / permission, trace login → middleware → page for every actor before declaring done.
- **Don't stack broken migrations.** If migration N is wrong, fix N — don't add N+1.
- **Update the plan as you learn.** A stale plan is worse than no plan.

## Don't

- Don't open a PR if any phase gate is red.
- Don't introduce a new dependency without flagging it in the PR description.
