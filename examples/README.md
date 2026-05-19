# Examples

Each subdirectory is the **generated output** of `my-claude-team` for a
real-world repository — committed verbatim so you can read it without
running the tool.

## [`optal-health-mvp-preview/`](./optal-health-mvp-preview)

Input: a Next.js 15 + NestJS + Prisma + Supabase + Stripe + Fly.io monorepo
(GDPR-compliant healthtech platform).

Generated artifacts:

- `CLAUDE.md` — 9 sections, project-specific paths, derived P0 rules.
- `.claude/INDEX.md` — workspace + skill/command tables.
- `.claude/agents/` — 9 agents (architect, backend, frontend, database, security, testing, ui, devops, code-reviewer).
- `.claude/skills/` — 11 skills (rules, feature-workflow, start/implement/create-* patterns, data-model, security-privacy, testing, bugfix, incident-review).
- `.claude/commands/` — 8 slash commands including `/create-my-claude-team-member`.
- `.claude/settings.local.json` — permission allowlist tuned to pnpm + Prisma + Supabase + Fly.io.
- `my-claude-team.config.ts` — starter config for project-specific overrides.

Read the [generated CLAUDE.md](./optal-health-mvp-preview/CLAUDE.md) and the
flagship slash command at
[`.claude/commands/create-my-claude-team-member.md`](./optal-health-mvp-preview/.claude/commands/create-my-claude-team-member.md)
to see what the framework actually produces.
