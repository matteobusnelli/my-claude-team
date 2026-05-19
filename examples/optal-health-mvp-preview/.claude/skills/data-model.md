---
name: data-model
description: Schema reference for prisma. Migration discipline, RLS expectations.
---

# Data model

**Source of truth:** `packages/database/prisma/schema.prisma` (prisma).
**Migrations:** `supabase/migrations/`.
**Approx. table count:** 11.
**Row-level security:** enabled. Policies live in code and are generated into migrations.

## Migration discipline

1. Edit the schema source.
2. Generate the migration via the ORM CLI (never hand-write SQL when avoidable).
3. Rebuild the local database from scratch to confirm the migration applies cleanly.
4. Open the PR with both the schema diff and the generated migration.

## Conventions

- One PR adds at most one migration.
- Migrations are forward-only — no downgrade scripts.
- Every new public table gets an RLS policy in the same PR.
- Schema-touching tests must pass before merge.

## Don't

- Don't edit a committed migration. Add a new one.
- Don't drop columns containing data without a planned data move.
- Don't add UPDATE/DELETE policies to audit tables.
