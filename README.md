# my-claude-team

> A context-intelligence engine for [Claude Code](https://claude.com/claude-code).
> Scans your repository, generates a project-specific `.claude/` setup —
> agents, skills, slash commands, P0 rules — that *reads handcrafted*.

This is not a template system. It deeply inspects your codebase (stack,
layout, conventions, compliance signals), then emits Markdown calibrated to
exactly what it found. No `<your-framework>` placeholders. The output cites
real file paths, real script names, real entity nouns.

```bash
npx my-claude-team init
```

That single command:

1. Scans the repo (frameworks, ORM, auth, storage, payments, CI, deployment, compliance).
2. Asks for a project name + description.
3. Generates `CLAUDE.md`, `.claude/INDEX.md`, agents tailored to the stack, skills tailored to the workflows, slash commands, and a permission allowlist.
4. Drops a `my-claude-team.config.ts` you can edit for things that survive regeneration.

The flagship slash command is:

```text
/create-my-claude-team-member
```

Run that inside Claude Code at any time to refresh the setup or add a new
specialist agent without leaving the conversation.

---

## Why

A great Claude Code setup needs three things that don't exist in a template:

1. **Calibrated rules** — "audit_logs is append-only" only matters if you
   actually have audit logs. "RLS on every table" only matters if you have
   RLS. Generic rule lists turn into noise.
2. **Real paths** — "the backend lives in `apps/api/` (NestJS 10.4)" is
   useful. "the backend lives in `<your-backend-dir>`" is not.
3. **Stack-aware delegation** — a `database` subagent is only useful if you
   have a database; an `incident-review` skill is only sharp if its
   categories match your actual risk surface.

`my-claude-team` produces all three from a single repo scan.

---

## Quick start

```bash
# From inside any repo
npx my-claude-team init
```

Other commands:

```bash
my-claude-team scan              # detect-only, prints what was found
my-claude-team scan --json       # machine-readable
my-claude-team generate agents   # regenerate one slice
my-claude-team generate all --force  # full rebuild (destructive)
my-claude-team doctor            # find drift between repo and existing setup
```

By default the generator **skips files that already exist**, so re-running
`init` is safe. Pass `--force` to overwrite, or use the `/rebuild-ai-setup`
slash command from inside Claude Code.

---

## What it generates

```
CLAUDE.md                            Authoritative repo guide (10 sections)
my-claude-team.config.ts             User-editable overrides
.claude/
├── INDEX.md                         Symbol → file map (load-first nav aid)
├── settings.local.json              Permission allowlist tuned to the stack
├── agents/
│   ├── architect.md                 Cross-cutting design decisions
│   ├── backend.md                   Server-side modules (if backend detected)
│   ├── frontend.md                  Pages, layouts (if frontend detected)
│   ├── database.md                  Schema + migrations (if DB detected)
│   ├── security.md                  Authn/authz, encryption, compliance
│   ├── testing.md                   Test design + fixtures
│   ├── ui.md                        Design system (if UI lib detected)
│   ├── devops.md                    CI/CD + deploy (if signals present)
│   └── code-reviewer.md             Read-only diff review
├── skills/
│   ├── rules.md                     P0 mandates — load every time
│   ├── feature-workflow.md          Master end-to-end workflow (size router)
│   ├── start-feature.md             Plan-stage bootstrap
│   ├── implement-feature.md         Phased full-stack orchestrator
│   ├── create-api-feature.md        Pattern for new server modules
│   ├── create-web-page.md           Pattern for new pages
│   ├── data-model.md                Schema + migration discipline
│   ├── security-privacy.md          Auth, RBAC, encryption, GDPR/HIPAA
│   ├── testing.md                   Test strategy + critical paths
│   ├── bugfix.md                    Reproduce → diagnose → fix → verify
│   └── incident-review.md           Production-risk audit framework
└── commands/
    ├── create-my-claude-team-member.md   ⭐ refresh / extend the team
    ├── analyze-repo.md
    ├── feature-workflow.md
    ├── bugfix.md
    ├── code-review.md
    ├── incident-review.md
    ├── typecheck.md
    └── rebuild-ai-setup.md
```

Skills, agents, and commands are only emitted when the underlying signal
exists. A repo with no DB doesn't get a `data-model` skill or a `database`
agent.

---

## Example: what it does for a real codebase

For a Next.js 15 + NestJS + Prisma + Supabase + Stripe + Fly.io monorepo,
the generator produces (excerpted from
[`examples/optal-health-mvp-preview/`](./examples/optal-health-mvp-preview)):

```markdown
## 5. Hard rules (P0)

1. **TS strict, no `any`.** Explicit return types on exported functions.
2. **Validate at the boundary.** Zod on every controller/route input.
3. **RLS on every public table.** No exceptions.
4. **`audit_logs` is append-only.** No UPDATE/DELETE policy for any role.
5. **Encrypt sensitive fields.** Use the project encryption layer before persistence.
6. **TDD.** Write a failing test before adding production code.
7. **No new `.md` files unless explicitly asked.**
```

Every rule was derived from a signal: Zod was in `package.json`, RLS code
exists in `packages/database/prisma/rls/`, `audit_logs` shows up in the SQL,
encryption code matches `AES-256-GCM`. If you remove Stripe from your deps,
the next regeneration drops the `Stripe webhook` risk category from
`incident-review.md`. If you add Clerk, the next regeneration switches the
auth language across every agent.

---

## Customizing

`my-claude-team.config.ts` survives regeneration:

```ts
import type { MyClaudeTeamConfig } from 'my-claude-team';

const config: MyClaudeTeamConfig = {
  projectName: 'optal-health-mvp',
  projectDescription: 'GDPR-compliant healthtech platform.',
  hardRules: [
    {
      id: 'eu-data',
      title: 'EU residency',
      body: 'All PII storage runs in `eu-west-*` regions only.',
    },
  ],
  permissions: ['Bash(custom-cli:*)'],
};
export default config;
```

Custom hard rules merge into CLAUDE.md §5. Custom permissions merge into
`.claude/settings.local.json`. Custom actors flow into agent prompts where
relevant.

---

## Extension model

The generator is built around two pure-function layers:

1. `detectProfile(root) → RepoProfile` — the intelligence engine.
   Detectors live in `src/intelligence/detectors/` and are independent.
   Add support for a new framework / ORM / provider by writing one detector
   and registering it.
2. `generateAll(ctx) → markdown` — the generation engine.
   Each artifact (CLAUDE.md, an agent, a skill) has a generator function
   that takes the `RepoProfile` and emits a string. Change behavior by
   editing the corresponding generator — never by hand-editing the output.

If you find yourself hand-editing a generated file, you've found a generator
bug. File it and the next regeneration fixes it for every user.

---

## Status

`0.1.0` — early. The public surface (`MyClaudeTeamConfig`, `RepoProfile`,
`detectProfile`, `generateAll`) is intentionally small and will evolve.

License: MIT.
