# my-claude-team

> A context-intelligence engine for [Claude Code](https://claude.com/claude-code).
> Lets Claude scan your repository and craft a project-specific `.claude/`
> setup — agents, skills, slash commands, P0 rules — calibrated to your
> actual stack.

No template placeholders. The output cites real file paths, real script
names, real entity nouns.

---

## Two steps

### 1. Install in your repo

```bash
npm install --save-dev github:matteobusnelli/my-claude-team
```

Install completes; the package automatically drops a single slash command
(`/create-my-claude-team-member`) and a permissions file into `.claude/`.
Nothing else is touched.

### 2. Open Claude Code and run

```text
/create-my-claude-team-member
```

Claude scans the codebase, samples representative source files, asks at
most two questions about your domain, and writes the full setup tailored
to what it found:

- `CLAUDE.md` — authoritative repo guide.
- `.claude/agents/` — specialist subagents tuned to your stack.
- `.claude/skills/` — workflows for features, bugs, reviews, security.
- `.claude/commands/` — slash commands.
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
