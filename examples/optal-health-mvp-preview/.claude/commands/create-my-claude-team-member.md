---
description: Generate or refresh the entire .claude/ AI team for this repository from current code state. Adds missing agents/skills/commands; preserves user-edited files.
allowed-tools: "Bash(npx my-claude-team:*), Bash(my-claude-team:*), Read, Edit, Write, Grep, Glob"
---

# /create-my-claude-team-member

Generate or refresh the AI team for this repo. Run this when:
- The stack has changed (new framework, new provider, removed service).
- A new domain capability has been added that warrants a specialist agent.
- The `.claude/` setup has drifted and needs a clean rebuild.
- You want to add a new custom agent / skill / command.

`$ARGUMENTS` (optional): a free-form description of what the new team member should specialize in. If empty, the command refreshes the entire team.

## Procedure

### 1. Scan the repository

Run the CLI to get a fresh `RepoProfile`:

```bash
npx my-claude-team scan --json > /tmp/mct-profile.json
```

Read the resulting JSON. Note any signal that disagrees with what the existing `.claude/` files assume (e.g. CLAUDE.md mentions Stripe but no Stripe deps are present).

### 2. Diagnose drift

Read each of these files and compare against the fresh profile:
- `CLAUDE.md` — stack sentence (§1), repo map (§2), build commands (§4), hard rules (§5).
- `.claude/INDEX.md` — workspace table, database table, skills/commands inventory.
- `.claude/agents/*.md` — frontmatter `description` should still match the agent's scope.
- `.claude/skills/*.md` — required-reads pointers and stack-specific commands.

For each drift point, decide: regenerate (stack-derived), or preserve (user-customized).

### 3. Understand the request (if `$ARGUMENTS` is non-empty)

The user is asking for a new specialist. Before generating anything:

1. State your understanding of what the agent should own — one paragraph.
2. List 3–5 existing files the agent will routinely touch.
3. Propose:
   - Agent name (kebab-case, short).
   - Tools list.
   - Required-reads list.
   - 3-step workflow.
   - 2-3 don'ts.
4. Wait for the user to confirm before writing the file.

### 4. Generate

For a refresh:

```bash
npx my-claude-team generate all
```

For a single artifact:

```bash
npx my-claude-team generate agents
npx my-claude-team generate skills
npx my-claude-team generate commands
npx my-claude-team generate claude-md
```

By default the generator **skips files that already exist** (preserves user edits). Pass `--force` to overwrite.

For a brand-new custom agent that the generator doesn't know about: write the file directly at `.claude/agents/<name>.md` following the convention encoded in the other agent files in this repo.

### 5. Validate

```bash
npx my-claude-team doctor
```

Reports drift between the current `.claude/` setup and the fresh profile.

### 6. Verify

- `pnpm typecheck` — make sure stack-specific commands referenced in generated files still work.
- Open one of the generated agent files and read it end-to-end. Does it read project-specific or generic? If generic, that's a generator bug — file an issue rather than hand-editing.

## Don't

- Don't run `generate all --force` without reading the diff. Generated files can be wrong; review them like any other PR.
- Don't generate an agent for a stack you don't have. The generator already filters by detected stack; if you find yourself overriding that, your repo probably has hidden complexity worth examining.
- Don't hand-edit generated files for stylistic reasons. Improve the generator instead — that's how the framework gets better for everyone.
