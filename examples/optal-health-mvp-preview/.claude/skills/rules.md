---
name: rules
description: Mandatory rules that override agent behavior. Load for every implementation task.
---

# P0 Rules

Non-negotiable. These override every agent's working defaults.

- **TypeScript strict.** Explicit return types on exports. No `any`.
- **Validate at the boundary.** Zod on every public entry point.
- **RLS on every public table.** No exceptions.
- **`audit_logs` is append-only.** No UPDATE/DELETE policy for any role.
- **Encrypt sensitive fields** via the project encryption layer before persistence.
- **Authz at multiple layers** — never rely on a single gate.
- **TDD.** Failing test before production code.
- **No new `.md` files** unless explicitly asked.
- **Edit existing files** rather than creating duplicates.

## Working principles

- Bias to action: brief plan, then code. Don't read 20 files before writing one.
- Prefer editing existing files over creating new ones.
- Match the scope of the change to the request. No drive-by refactors.
- After any TypeScript edit: `pnpm typecheck` before declaring done.
