# CLAUDE.md

Guidance for Claude Code working in this repository. Authoritative — overrides any default behavior.

## 1. What this is

**optal-health-mvp** — Full-stack app — Next.js frontend + NestJS backend, backed by prisma, auth via Supabase Auth, billing via Stripe.

**Stack:** TypeScript strict, pnpm, turborepo, Next.js, React, NestJS, prisma, shadcn/ui + Tailwind, Jest, Fly.io.

## 2. Repo map

```
apps/api           NestJS app
apps/web           Next.js (app-router, rsc)
packages/database  shared package — `@repo/database`
packages/security  shared package — `@repo/security`
packages/types     shared package — `@repo/types`
packages/ui        shared package — `@repo/ui`
supabase/migrations/  database migrations
docs/                project documentation
.claude/INDEX.md     symbol → file map (read this first for navigation)
.claude/skills/      domain skills loaded on-demand (see §6)
.claude/agents/      specialized subagents (see §7)
.claude/commands/    slash commands
```

For a fast symbol→path lookup, **read `.claude/INDEX.md` before searching the codebase.**

## 3. Scope

**Editable:**
- `apps/api/`
- `apps/web/`
- `packages/database/`
- `packages/security/`
- `packages/types/`
- `packages/ui/`
- `supabase/migrations/`
- `docs/`
- `.claude/` (when explicitly asked)

**Touch with care (regenerated):**
- `prisma/migrations/` — emitted by `prisma migrate dev`
- `dist/`, `build/`, `.next/`, `.turbo/`, `node_modules/` — build artifacts

**Never modify without explicit ask:**
- `.git/`, lockfiles (let the package manager manage), `node_modules/`

## 4. Build / dev commands (canonical)

```bash
# Dev
pnpm dev

# Verify
pnpm typecheck
pnpm test
pnpm lint

# Build
pnpm build
```

After ANY edit to `*.ts`/`*.tsx`, run `pnpm typecheck` before declaring done. **Don't leave compile errors for the user.**

## 5. Hard rules (P0)

1. **TS strict, no `any`.** Explicit return types on exported functions.
2. **Validate at the boundary.** Zod on every controller/route input.
3. **RLS on every public table.** No exceptions. Row-level security is the last line of defense.
4. **`audit_logs` is append-only.** No UPDATE/DELETE policy for any role, ever.
5. **Encrypt sensitive fields.** Use the project encryption layer before persistence — never store PII in plaintext.
6. **TDD.** Write a failing test before adding production code.
7. **No new `.md` files unless explicitly asked.** Use existing docs; do not create planning/decision docs as a side effect of work.

## 6. Skill loading (on-demand)

Match the user's request against the table below. Load matched files in **parallel** with `Read` before doing anything else. **Always load `.claude/skills/rules.md` for any implementation task.**

> **Master entry point for any new work:** if the user asks to implement, add, build, create, scope, or fix anything, run `/feature-workflow` FIRST. Don't jump straight to a sub-skill.

| Domain | Triggers | File |
| --- | --- | --- |
| Mandatory rules | any implementation task | `.claude/skills/rules.md` |
| **Master workflow — entry point for any new work** | `/feature-workflow`, `implement`, `add feature`, `build`, `create`, `start working on` | `.claude/skills/feature-workflow.md` |
| Plan a non-trivial feature | `start feature`, `plan dir`, `backlog` | `.claude/skills/start-feature.md` |
| Full-stack orchestrator | after plan approved, `phased implementation` | `.claude/skills/implement-feature.md` |
| Bug fix workflow | `bug`, `fix`, `broken`, `regression`, `/bugfix` | `.claude/skills/bugfix.md` |
| Production-risk review | `/incident-review`, `production risk`, pre-merge gate | `.claude/skills/incident-review.md` |
| Testing | `test`, `TDD`, fixtures | `.claude/skills/testing.md` |
| New API endpoint / module | `endpoint`, `controller`, `service`, `route handler` | `.claude/skills/create-api-feature.md` |
| New page / route | `page`, `route`, `RSC`, `client component` | `.claude/skills/create-web-page.md` |
| Database & schema | `schema`, `migration`, `data-model` | `.claude/skills/data-model.md` |
| Security & privacy | `auth`, `RBAC`, `encryption`, `GDPR`, `JWT` | `.claude/skills/security-privacy.md` |

If multiple match, load all in parallel. If none match, proceed with this file alone.

## 7. Subagents (delegation)

Spawn an agent only when the task is genuinely scoped to one domain and large enough to warrant the cold-start cost.

| Agent | When to use |
| --- | --- |
| `architect` | High-level architecture decisions, cross-cutting refactors |
| `code-reviewer` | Pre-commit / pre-merge review on the current branch (read-only) |
| `backend` | Server-side modules, controllers, services, validators |
| `frontend` | Pages, layouts, middleware, client/server component decisions |
| `database` | Schema, migrations, query design, indexes |
| `ui` | Design system primitives, accessibility |
| `security` | Authn/authz, encryption, secrets, GDPR/HIPAA controls |
| `testing` | Test plan, fixtures, critical-path coverage |
| `devops` | Docker, CI/CD, deployment configs, secrets |

Otherwise handle inline. Agents are ~free in tokens but expensive in latency and context.

## 8. Post-implementation checklist

1. `pnpm typecheck` for every touched package.
2. `pnpm test` for every touched package.
3. If schema changed: rebuild local DB from scratch to confirm migrations apply.
4. Auth flows: trace login → middleware → dashboard for each role; confirm tokens are sent.
5. If new tables/columns: confirm RLS is enabled and policies cover every operation each role needs.
6. Stop any background dev server you started.

## 9. Working style

- **For any new feature, endpoint, page, schema change, or fix: run `/feature-workflow` FIRST.** It is the canonical end-to-end flow with size-based routing.
- Bias to action. Brief plan (≤10 lines), then code. Don't read 20 files before writing one.
- For ambiguous tasks: state your read of the root cause + files you'll touch + assumptions, then implement.
- Prefer editing existing files over creating new ones. Never create duplicate files with the same role.
- When you stop a `pnpm dev`, kill the background process — don't leave it running.
