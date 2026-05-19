# Repo Navigation Index

Symbol/concept → file. Use this before grepping. Updated when paths change.

## Top-level docs

See `docs/` for project-specific documentation.

## Workspaces

| Path | Kind | Package name |
| --- | --- | --- |
| `apps/api` | app | `api` |
| `apps/web` | app | `web` |
| `packages/database` | package | `@repo/database` |
| `packages/security` | package | `@repo/security` |
| `packages/types` | package | `@repo/types` |
| `packages/ui` | package | `@repo/ui` |

## Database

| Concern | Path |
| --- | --- |
| Schema source of truth | `packages/database/prisma/schema.prisma` |
| Migrations | `supabase/migrations/` |
| Approx. table count | 11 |
| Row-level security | enabled |

## Skills (AI workflows)

| Skill | Purpose |
| --- | --- |
| `.claude/skills/rules.md` | P0 mandates — load for every implementation task |
| `.claude/skills/feature-workflow.md` | Master end-to-end workflow; size-based routing |
| `.claude/skills/start-feature.md` | Bootstrap a plan dir for a non-trivial feature |
| `.claude/skills/implement-feature.md` | Full-stack orchestrator across schema → backend → frontend |
| `.claude/skills/bugfix.md` | Reproduce → diagnose → minimal fix → verify |
| `.claude/skills/incident-review.md` | Production-risk audit framework |
| `.claude/skills/testing.md` | Test strategy, fixtures, critical-path catalog |
| `.claude/skills/create-api-feature.md` | Pattern for new server-side modules |
| `.claude/skills/create-web-page.md` | Pattern for new client/server pages |
| `.claude/skills/data-model.md` | Schema, migrations, relationships reference |
| `.claude/skills/security-privacy.md` | Auth, RBAC, encryption, GDPR/HIPAA controls |

## Slash commands

| Command | Purpose |
| --- | --- |
| `/create-my-claude-team-member` | Generate / refresh this entire AI setup from current repo state |
| `/analyze-repo` | Print the detected RepoProfile |
| `/feature-workflow` | Master entry point for any new work |
| `/bugfix` | Systematic bug-fix workflow |
| `/code-review` | Invoke the code-reviewer agent on current branch |
| `/incident-review` | Production-risk review of current branch or a PR |
| `/rebuild-ai-setup` | Wipe and re-generate .claude/ from scratch |
| `/typecheck` | Run TypeScript typecheck (scoped or full) |

## Subagents

| Agent | Scope |
| --- | --- |
| `architect` | Cross-cutting design decisions |
| `code-reviewer` | Read-only diff review |
| `backend` | Server-side modules + handlers |
| `frontend` | Pages, layouts, middleware |
| `database` | Schema + migrations + queries |
| `ui` | Design-system primitives + a11y |
| `security` | Authn/authz, encryption, GDPR |
| `testing` | Test plan + fixtures |
| `devops` | Containers, CI/CD, deploy configs |

## CI & quality

- Platform: `github-actions`
- Workflow: `.github/workflows/ci.yml`
