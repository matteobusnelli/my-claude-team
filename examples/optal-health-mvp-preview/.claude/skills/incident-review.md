---
name: incident-review
description: Production-risk audit. Read-only. Run before merge for any non-trivial change.
---

# Incident review

Read-only audit against 9 risk categories. Not a code review — this is a production-safety gate.

## When to use

- Before merging anything that touches auth, data, billing, or migrations.
- After a P0 incident, on the suspected commit.
- Periodically on `main` to surface drift.

## Procedure

1. `git diff main...HEAD` (or `gh pr diff <PR#>`).
2. Load `.claude/skills/rules.md` and any topic skills relevant to the diff.
3. Walk each risk category below — for each, either confirm "no risk" or flag with file:line.
4. Produce a structured report: 🚨 Critical / ⚠️ Warning / ✅ OK per category.

## Risk categories

1. **RLS bypass** — new public tables without policies, or policies that grant too much.
2. **Audit tampering** — UPDATE/DELETE policies appearing on audit tables.
3. **RBAC drops** — handler missing a role guard, or middleware whitelisting a sensitive path.
4. **Encryption regression** — a sensitive field written without going through the encryption service.
5. **Stripe webhook** — signature verification removed, raw body parsed twice, missing idempotency.
6. **Supabase Storage signed URLs** — missing expiry, public bucket usage, leaked URLs in logs.
7. **Migration safety** — irreversible drops, unindexed FKs, missing NOT NULL on hot paths.
8. **Secret leakage** — keys committed, env files staged, secrets logged.
9. **Fly.io drift** — deploy config changes without a rollback plan.

## Don't

- Don't modify code. If you spot a fix, file it as a finding.
- Don't lower the bar to "ship the PR". Critical findings block merge.
