# my-claude-team

> A context-intelligence engine for [Claude Code](https://claude.com/claude-code).
> Scans your repository and generates a project-specific `.claude/` setup —
> agents, skills, slash commands, P0 rules — calibrated to your actual stack.

No template placeholders. The output cites real file paths, real script
names, real entity nouns.

---

## Install

```bash
npm install --save-dev github:matteobusnelli/my-claude-team
npx my-claude-team init
```

That's it. The scan + full generation runs non-interactively.

The CLI detects frameworks, ORM, auth, payments, CI, deployment, and
compliance signals — then writes:

- `CLAUDE.md` — authoritative repo guide.
- `.claude/agents/` — specialist subagents tuned to your stack.
- `.claude/skills/` — workflows for features, bugs, reviews, security.
- `.claude/commands/` — slash commands.
- `.claude/settings.local.json` — permission allowlist tuned to your tools.
- `my-claude-team.config.ts` — user-editable overrides that survive regeneration.

Re-running `init` is safe — existing files are skipped. Pass `--force` to
overwrite, or `--interactive` (or `-i`) to get prompted for project name
and description.

---

## Refresh or extend

Inside Claude Code, after setup:

```text
/create-my-claude-team-member
```

This slash command refreshes the setup when your stack changes, or
generates a custom specialist the framework didn't ship with.

---

## More

- Architecture and design: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Sample output (real Next.js + NestJS + Prisma + Supabase + Stripe monorepo): [`examples/optal-health-mvp-preview/`](./examples/optal-health-mvp-preview)

License: MIT.
