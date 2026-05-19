# my-claude-team

> A context-intelligence engine for [Claude Code](https://claude.com/claude-code).
> Lets Claude scan your repository and craft a project-specific `.claude/`
> setup — agents, skills, slash commands, P0 rules — calibrated to your
> actual stack.

No template placeholders. The output cites real file paths, real script
names, real entity nouns.

---

## Setup (two terminal commands, then Claude does the rest)

```bash
npm install --save-dev github:matteobusnelli/my-claude-team
npx my-claude-team init
```

That's all in the terminal. `init` only drops a bootstrap slash command
and a permissions file. Then:

```text
Open Claude Code → /create-my-claude-team-member
```

Claude scans the codebase, reads a few representative files, asks at most
two questions about your domain, and writes the full setup tailored to
what it found. The generator handles the deterministic 80% (frameworks,
paths, conventions); Claude adds the judgmental 20% (domain narrative,
custom rules, agent ownership statements that cite real files).

What gets written:

- `CLAUDE.md` — authoritative repo guide.
- `.claude/agents/` — specialist subagents tuned to your stack.
- `.claude/skills/` — workflows for features, bugs, reviews, security.
- `.claude/commands/` — slash commands.
- `.claude/settings.local.json` — permission allowlist tuned to your tools.
- `my-claude-team.config.ts` — user-editable overrides that survive regeneration.

Re-running `/create-my-claude-team-member` later refreshes the setup when
the stack changes, or adds a custom specialist:

```text
/create-my-claude-team-member analytics tracker
```

---

## Non-LLM mode (CI, automation)

If you don't want a Claude Code session in the loop — e.g. running in CI:

```bash
npx my-claude-team init --full
```

Generates the same files, all deterministic, no Claude. Faster, less
polished — the auto-generated text won't have your domain narrative,
but the structure is identical.

---

## More

- Architecture and design: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Sample output (real Next.js + NestJS + Prisma + Supabase + Stripe monorepo): [`examples/optal-health-mvp-preview/`](./examples/optal-health-mvp-preview)

License: MIT.
