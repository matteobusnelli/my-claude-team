---
name: feature-workflow
description: Master end-to-end workflow. Size decision → routing → verification → PR. Entry point for all new work.
---

# Feature workflow (master)

The single entry point for any new feature, endpoint, page, schema change, or fix.

## Step 1 — Size decision

| Path | When | Skills loaded |
|---|---|---|
| **A** Small / single-layer | Adds one endpoint, one page, or one schema change with no cross-cutting impact. | `create-api-feature` / `create-web-page` / `data-model` |
| **B** Non-trivial | Spans 2+ layers, or has new domain entities. | `start-feature` → `implement-feature` |
| **C** Bug | Existing behavior is wrong. | `bugfix` |

Pick the smallest path that fits — don't over-engineer.

## Path A (small)

1. Load the single relevant pattern skill from the table above.
2. Implement following its procedure.
3. Run verification gates (below).
4. Open the PR.

## Path B (non-trivial)

1. Load `start-feature` — bootstrap `docs/plans/<slug>/` with `plan.md` + `backlog.md`.
2. Get the plan approved by the user before any code.
3. Load `implement-feature` — phased execution across schema → backend → frontend → verification.
4. Run verification gates.
5. Open the PR with a link to the plan dir.

## Path C (bug)

1. Load `bugfix` and follow its 6-step procedure.
2. The fix lands with a regression test that proves the original symptom.

## Verification gates (every path)

- `pnpm typecheck` on every touched workspace.
- `pnpm test` for every touched workspace.
- `pnpm lint`
- If schema changed: rebuild local DB from scratch, confirm migrations apply.
- Stop any background dev server you started.

## Don't

- Don't skip step 1. Picking the wrong path costs more than measuring twice.
- Don't bundle unrelated changes into one PR.
- Don't call `/code-review` to "find work" — only after you believe the change is done.
