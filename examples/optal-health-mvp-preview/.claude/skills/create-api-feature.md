---
name: create-api-feature
description: Pattern for adding a new NestJS endpoint/module under apps/api/. Loaded for Path A backend work.
---

# Create an API feature

Use when: adding a new endpoint or module to `apps/api/` (NestJS 10.4.15).

## Canonical folder shape

Follow the existing module structure under `apps/api/`. Sample one neighbor before adding yours.

## Required reads

- `.claude/skills/rules.md`
- `.claude/skills/data-model.md` (if your endpoint touches new entities)
- `.claude/skills/security-privacy.md` (if your endpoint is authenticated)

## Procedure

1. **Plan** — list the new files, the public route, the auth requirement, the validation schema.
2. **Schema** — if the data model changes, do that FIRST (delegate to `data-model` workflow).
3. **Validation schema** — define Zod schemas at the module boundary.
4. **Service test (TDD)** — write a failing Jest test for the new behavior.
5. **Service implementation** — make the test pass; keep handlers thin.
6. **Handler** — wire to the route, decorate with auth/validation (Zod).
7. **Verify** — `pnpm test` and `pnpm typecheck` both green.
8. **Update** `.claude/INDEX.md` if you added a new module — keep the symbol map honest.

## Don't

- Don't expose raw entities — return DTOs.
- Don't skip error shaping. Use the project's exception type, not ad-hoc `throw new Error`.
- Don't persist sensitive fields without going through the encryption layer.
