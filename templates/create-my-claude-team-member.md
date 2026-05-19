---
description: Set up (or refresh) the full .claude/ AI team for this repository. Claude scans the codebase, asks a couple of questions, and tailors every file to what it finds.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# /create-my-claude-team-member

Set up (or refresh) the AI team for this codebase. **Fully autonomous —
do not stop to ask questions, do not request confirmation. Run the
entire flow end-to-end and report when finished.**

`$ARGUMENTS` (optional): a description of a *new specialist* to add on
top of the standard team. If empty, regenerate the whole `.claude/`
directory.

---

## Procedure (run all steps without pausing)

### 1. Scan

```bash
npx my-claude-team scan --json > /tmp/mct-profile.json
cat /tmp/mct-profile.json
```

Read the JSON. This is the deterministic baseline.

### 2. Sample the codebase

Read 5–8 files chosen for diversity:

- The main entry point of each app/service.
- One representative feature module (e.g. a controller + its service, or
  a page + its loader).
- The auth boundary (middleware, JWT strategy, session check) — if any.
- A schema or migration file — if a database is present.
- A test file — if tests exist.
- If `docs/` exists, the top-level overview doc.

Note: domain vocabulary, naming conventions, anything unusual.

### 3. Infer project description and existing rules (do not ask the user)

In this order, take the first one that exists:

1. **Existing `CLAUDE.md` §1** — if a CLAUDE.md is already in this
   repo, use its first-paragraph description verbatim as the project
   sentence. Also extract any custom rules already listed in §5.
2. **`README.md` first paragraph** — strip markdown, pick the first
   sentence that describes what the project does.
3. **`package.json` `description` field** — use as-is if present.
4. **Fall back to the auto-generated stack-based sentence** the
   generator would emit on its own.

For hard rules, also scan the code you sampled in step 2 for obvious
patterns to elevate (e.g. `useTranslation` everywhere → "Never
hardcode user-facing strings", `VITE_` prefix discipline → "Server-only
env vars never start with `VITE_`", etc.). Add a rule only when the
evidence is clear in the code, not speculative.

### 4. Generate (overwrite)

```bash
npx my-claude-team generate all --force
```

`--force` overwrites every file. The slash command runs autonomously
and is expected to fully (re)build the setup each time it's invoked.

### 5. Refine

Use Edit on the files just written. Apply the inferences from step 3:

1. **`CLAUDE.md` §1.** Replace the auto-generated sentence with the
   description you inferred.
2. **`CLAUDE.md` §5.** Insert any custom rules you carried over from
   the existing CLAUDE.md, plus any new rules with clear code evidence.
   Order with the most-likely-to-be-violated first.
3. **`.claude/agents/*.md` — ownership statements.** For each agent,
   the first paragraph should cite 1–3 specific files you sampled in
   step 2. Replace generic phrases like "the data layer" with concrete
   file paths.
4. **`.claude/skills/*.md` — required-reads.** Where a skill points to
   `docs/SOMETHING.md`, verify the file exists. If not, remove the
   reference.
5. **`.claude/INDEX.md`** — add 3–5 entries for the most-touched files
   you sampled.

### 6. Validate

```bash
npx my-claude-team doctor
```

### 7. Report

Print a single concise summary:

- Files written (count + groups).
- Project description used (verbatim, in quotes) and its source.
- Custom rules added and why.
- 2–3 agents most heavily refined and which files you cited.
- Anything the user might want to address next.

---

## Adding a single custom specialist (`$ARGUMENTS` non-empty)

If the user invoked this command with a description (e.g.
`/create-my-claude-team-member analytics tracker`):

1. Skim the codebase to identify 3–5 files the agent will routinely touch.
2. Write `.claude/agents/<kebab-name>.md` directly using the same
   frontmatter convention as the other agent files in `.claude/agents/`.
3. Add an entry to CLAUDE.md §7's agent table.
4. Report what you added.

(Still no questions — infer scope from `$ARGUMENTS` + the codebase.)

## Don't

- **Don't ask the user questions.** Infer everything from existing
  files (CLAUDE.md, README, package.json) + the code you sampled.
- Don't make up domain rules. If you didn't see evidence in the code
  or in an existing CLAUDE.md, don't add it.
- Don't hand-edit a file just because it could be prettier. Edit when
  the content is *wrong*, not when it's not your style.
