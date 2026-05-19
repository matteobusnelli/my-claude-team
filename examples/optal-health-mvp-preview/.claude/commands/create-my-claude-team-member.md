---
description: Set up (or refresh) the full .claude/ AI team for this repository. Claude scans the codebase, asks a couple of questions, and tailors every file to what it finds.
allowed-tools: "Bash(npx my-claude-team:*), Bash(my-claude-team:*), Bash(cat:*), Bash(ls:*), Read, Edit, Write, Grep, Glob"
---

# /create-my-claude-team-member

Set up (or refresh) the AI team for this codebase. This is the primary
entry point — run this once after `npx my-claude-team init`, and again
later whenever the stack changes or you want a custom specialist.

`$ARGUMENTS` (optional): a description of a *new specialist* to add on
top of the standard team. If empty, this command sets up (first run) or
refreshes (subsequent runs) the whole `.claude/` directory.

---

## Detect mode

Run `ls .claude/agents 2>/dev/null | head -1`.

- **No output** → **First-run mode.** No agents exist yet; you're doing
  the initial setup. Follow steps 1 → 6 below.
- **Output present** → **Refresh mode.** A setup already exists. Skip
  step 3 (the user already answered) and look at the existing CLAUDE.md
  §1 for project description. Follow 1 → 2 → 4 → 5 → 6 to refresh.

---

## 1. Scan the repository

```bash
npx my-claude-team scan --json > /tmp/mct-profile.json
cat /tmp/mct-profile.json
```

Read the JSON. This is the deterministic baseline: package manager,
monorepo shape, frameworks, ORM, auth, payments, CI, deployment, and
compliance signals — all derived from package.json + lockfile +
filesystem scan.

## 2. Sample the codebase

The scan gives you stack labels. To write something that *reads
handcrafted*, you also need to see real code. Read 5–8 files chosen for
maximum diversity:

- The main entry point of each app/service (e.g. `apps/api/src/main.ts`,
  `apps/web/src/app/layout.tsx`).
- One representative feature module (a controller + its service, or a
  page + its loader).
- The auth boundary (middleware, JWT strategy, or session check).
- A schema or migration file, if a database is present.
- A test file, to see how tests are written.
- If the project has a `docs/` folder, the top-level overview doc.

Note as you read: domain vocabulary in code (what nouns recur?), naming
conventions, business-logic complexity, anything unusual.

## 3. (First run only) Ask the user — at most two questions

Keep it short. Defaults are fine if the user skips. Ask **once**, in a
single message:

> Two quick questions:
> 1. In one sentence, what does this project do? (e.g. "GDPR-compliant
>    portal for clinicians to manage patient lab uploads.")
> 2. Any rule that overrides defaults? (e.g. "Never store PII outside
>    EU regions" / "All endpoints must accept idempotency keys.")
>    Skip if none.

Store the answers — you'll bake them into CLAUDE.md.

## 4. Generate the baseline

```bash
npx my-claude-team generate all --force
```

This writes the entire `.claude/` tree tuned to the scan. Every file is
already project-specific (real paths, real script names, real
frameworks) — but it's the deterministic 80%. Step 5 adds the 20% only
you can write.

## 5. Refine

Read each file the generator wrote and apply judgment. **Use Edit
sparingly — every change must be defensible.**

Targets in priority order:

1. **`CLAUDE.md` §1 — "What this is."** Replace the auto-generated
   sentence with the user's answer from step 3. If they skipped, leave
   the auto-generated version.

2. **`CLAUDE.md` §5 — "Hard rules (P0)."** Add any custom rules from
   step 3. Order them with the most-likely-to-be-violated first.

3. **`.claude/agents/*.md` — ownership statements.** For each agent,
   the first paragraph should cite 1–3 specific files you sampled in
   step 2. Replace generic phrases like "the data layer" with concrete
   file paths.

4. **`.claude/skills/*.md` — required-reads.** Where a skill points to
   `docs/SOMETHING.md`, verify the file actually exists. If not,
   remove the reference.

5. **`.claude/INDEX.md`** — add 3–5 entries for the most-touched files
   you sampled. The auto-generated index is workspace-level; you're
   adding file-level navigation.

## 6. Validate and report

```bash
npx my-claude-team doctor
```

Then read **one** agent file end-to-end out loud (in your head). Ask:
*"Does this sound like this codebase, or could this apply to any
codebase?"* If the latter, refine more — that's the test that matters.

Report back to the user:

- Files written (just the count + groups).
- Custom rules added (if any from step 3).
- The 2–3 agents you spent the most time refining and why.
- Anything you noticed that the user might want to address (e.g.
  "I noticed there's no test file under `apps/api`; you may want to
  add one before invoking the testing agent").

---

## Adding a single custom specialist (`$ARGUMENTS` non-empty)

If the user invoked this command with a description like
`/create-my-claude-team-member analytics tracker`:

1. State your read of what the agent should own — one paragraph.
2. List 3–5 files the agent will routinely touch (from your codebase scan).
3. Propose the full agent definition (name, tools, required reads,
   workflow, don'ts) inline.
4. Wait for confirmation before writing.
5. Write to `.claude/agents/<kebab-name>.md` using the same frontmatter
   convention as the other files in `.claude/agents/`.
6. Add an entry to CLAUDE.md §7's agent table.

## Don't

- Don't skip step 2. The scan is the structure; the sampling is the soul.
- Don't run `generate all --force` more than once per session — your
  refinements get wiped. Generate once, refine in place.
- Don't hand-edit a file just because it could be prettier. Edit when
  the content is *wrong*, not when it's not your style.
- Don't make up domain rules. If you didn't see evidence of a constraint
  in the code or hear it from the user, don't add it.
