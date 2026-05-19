/**
 * Slash-command generators. Commands are thin dispatchers — they load skills
 * or agents and tell Claude what to do. The most important one is
 * `/create-my-claude-team-member`, which is how a user regenerates the entire
 * setup from inside a conversation.
 */

import type { GenerationContext } from '../../types/config.js';
import { withFrontmatter } from '../../lib/markdown.js';
import {
  typecheckCmd,
  testCmd,
  selectAgents,
  selectSkills,
  projectLabel,
} from '../shared.js';

interface CommandSpec {
  description: string;
  allowedTools?: string;
  body: string;
}

export function generateCommand(id: string, ctx: GenerationContext): string {
  const spec = buildCommand(id, ctx);
  return withFrontmatter(
    spec.allowedTools
      ? { description: spec.description, 'allowed-tools': spec.allowedTools }
      : { description: spec.description },
    spec.body
  );
}

function buildCommand(id: string, ctx: GenerationContext): CommandSpec {
  switch (id) {
    case 'create-my-claude-team-member': return createMemberCmd(ctx);
    case 'analyze-repo': return analyzeRepoCmd(ctx);
    case 'feature-workflow': return featureWorkflowCmd(ctx);
    case 'bugfix': return bugfixCmd(ctx);
    case 'code-review': return codeReviewCmd(ctx);
    case 'incident-review': return incidentReviewCmd(ctx);
    case 'typecheck': return typecheckCmdDef(ctx);
    case 'rebuild-ai-setup': return rebuildCmd(ctx);
    default: throw new Error(`Unknown command id: ${id}`);
  }
}

// ---------------- commands ----------------

function createMemberCmd(ctx: GenerationContext): CommandSpec {
  const p = ctx.profile;
  return {
    description: 'Set up (or refresh) the full .claude/ AI team for this repository. Claude scans the codebase, asks a couple of questions, and tailors every file to what it finds.',
    allowedTools: 'Bash(npx my-claude-team:*), Bash(my-claude-team:*), Bash(cat:*), Bash(ls:*), Read, Edit, Write, Grep, Glob',
    body: `# /create-my-claude-team-member

Set up (or refresh) the AI team for this codebase. This is the only
entry point — run this once right after installing \`my-claude-team\`,
and again later whenever the stack changes or you want a custom specialist.

\`$ARGUMENTS\` (optional): a description of a *new specialist* to add on
top of the standard team. If empty, this command sets up (first run) or
refreshes (subsequent runs) the whole \`.claude/\` directory.

---

## Detect mode

Run \`ls .claude/agents 2>/dev/null | head -1\`.

- **No output** → **First-run mode.** No agents exist yet; you're doing
  the initial setup. Follow steps 1 → 6 below.
- **Output present** → **Refresh mode.** A setup already exists. Skip
  step 3 (the user already answered) and look at the existing CLAUDE.md
  §1 for project description. Follow 1 → 2 → 4 → 5 → 6 to refresh.

---

## 1. Scan the repository

\`\`\`bash
npx my-claude-team scan --json > /tmp/mct-profile.json
cat /tmp/mct-profile.json
\`\`\`

Read the JSON. This is the deterministic baseline: package manager,
monorepo shape, frameworks, ORM, auth, payments, CI, deployment, and
compliance signals — all derived from package.json + lockfile +
filesystem scan.

## 2. Sample the codebase

The scan gives you stack labels. To write something that *reads
handcrafted*, you also need to see real code. Read 5–8 files chosen for
maximum diversity:

- The main entry point of each app/service (e.g. \`apps/api/src/main.ts\`,
  \`apps/web/src/app/layout.tsx\`).
- One representative feature module (a controller + its service, or a
  page + its loader).
- The auth boundary (middleware, JWT strategy, or session check).
- A schema or migration file, if a database is present.
- A test file, to see how tests are written.
- If the project has a \`docs/\` folder, the top-level overview doc.

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

\`\`\`bash
npx my-claude-team generate all --force
\`\`\`

This writes the entire \`.claude/\` tree tuned to the scan. Every file is
already project-specific (real paths, real script names, real
frameworks) — but it's the deterministic 80%. Step 5 adds the 20% only
you can write.

## 5. Refine

Read each file the generator wrote and apply judgment. **Use Edit
sparingly — every change must be defensible.**

Targets in priority order:

1. **\`CLAUDE.md\` §1 — "What this is."** Replace the auto-generated
   sentence with the user's answer from step 3. If they skipped, leave
   the auto-generated version.

2. **\`CLAUDE.md\` §5 — "Hard rules (P0)."** Add any custom rules from
   step 3. Order them with the most-likely-to-be-violated first.

3. **\`.claude/agents/*.md\` — ownership statements.** For each agent,
   the first paragraph should cite 1–3 specific files you sampled in
   step 2. Replace generic phrases like "the data layer" with concrete
   file paths.

4. **\`.claude/skills/*.md\` — required-reads.** Where a skill points to
   \`docs/SOMETHING.md\`, verify the file actually exists. If not,
   remove the reference.

5. **\`.claude/INDEX.md\`** — add 3–5 entries for the most-touched files
   you sampled. The auto-generated index is workspace-level; you're
   adding file-level navigation.

## 6. Validate and report

\`\`\`bash
npx my-claude-team doctor
\`\`\`

Then read **one** agent file end-to-end out loud (in your head). Ask:
*"Does this sound like this codebase, or could this apply to any
codebase?"* If the latter, refine more — that's the test that matters.

Report back to the user:

- Files written (just the count + groups).
- Custom rules added (if any from step 3).
- The 2–3 agents you spent the most time refining and why.
- Anything you noticed that the user might want to address (e.g.
  "I noticed there's no test file under \`apps/api\`; you may want to
  add one before invoking the testing agent").

---

## Adding a single custom specialist (\`$ARGUMENTS\` non-empty)

If the user invoked this command with a description like
\`/create-my-claude-team-member analytics tracker\`:

1. State your read of what the agent should own — one paragraph.
2. List 3–5 files the agent will routinely touch (from your codebase scan).
3. Propose the full agent definition (name, tools, required reads,
   workflow, don'ts) inline.
4. Wait for confirmation before writing.
5. Write to \`.claude/agents/<kebab-name>.md\` using the same frontmatter
   convention as the other files in \`.claude/agents/\`.
6. Add an entry to CLAUDE.md §7's agent table.

## Don't

- Don't skip step 2. The scan is the structure; the sampling is the soul.
- Don't run \`generate all --force\` more than once per session — your
  refinements get wiped. Generate once, refine in place.
- Don't hand-edit a file just because it could be prettier. Edit when
  the content is *wrong*, not when it's not your style.
- Don't make up domain rules. If you didn't see evidence of a constraint
  in the code or hear it from the user, don't add it.
`,
  };
}

function analyzeRepoCmd(ctx: GenerationContext): CommandSpec {
  return {
    description: 'Print the detected repository profile (stack, layout, conventions, compliance signals).',
    allowedTools: 'Bash(npx my-claude-team:*), Bash(my-claude-team:*)',
    body: `# /analyze-repo

Prints the detected \`RepoProfile\` for this repository. Useful to understand what the framework sees before regenerating.

\`\`\`bash
npx my-claude-team scan
\`\`\`

For machine-readable output:

\`\`\`bash
npx my-claude-team scan --json
\`\`\`
`,
  };
}

function featureWorkflowCmd(ctx: GenerationContext): CommandSpec {
  return {
    description: 'Master workflow for any new feature, endpoint, page, schema change, or fix.',
    body: `# /feature-workflow

Load \`.claude/skills/feature-workflow.md\` and follow its size-decision step.

\`$ARGUMENTS\` is the feature brief — pass it through to the skill's procedure.
`,
  };
}

function bugfixCmd(ctx: GenerationContext): CommandSpec {
  return {
    description: 'Systematic bug-fix workflow: reproduce → diagnose → test → fix → verify.',
    body: `# /bugfix

Load \`.claude/skills/bugfix.md\` and follow its 6-step procedure.

\`$ARGUMENTS\` is the symptom — pass it as the reproduction target.
`,
  };
}

function codeReviewCmd(ctx: GenerationContext): CommandSpec {
  return {
    description: 'Review the current branch against the project P0 rules.',
    body: `# /code-review

Spawn the \`code-reviewer\` agent on the current branch. Read-only.

\`$ARGUMENTS\` (optional): a file or path subset to limit the scope.
`,
  };
}

function incidentReviewCmd(ctx: GenerationContext): CommandSpec {
  return {
    description: 'Production-risk review of the current branch or a PR.',
    allowedTools: 'Bash(git diff:*), Bash(git log:*), Bash(gh pr view:*), Bash(gh pr diff:*), Read, Grep, Glob',
    body: `# /incident-review

Load \`.claude/skills/incident-review.md\` and audit the current branch (or the PR named in \`$ARGUMENTS\`) against every risk category.

\`\`\`bash
# Current branch
git diff main...HEAD

# Specific PR
gh pr diff <PR#>
\`\`\`
`,
  };
}

function typecheckCmdDef(ctx: GenerationContext): CommandSpec {
  const p = ctx.profile;
  const pm = p.packageManager ?? 'npm';
  return {
    description: 'Run TypeScript typecheck — full repo or scoped to a workspace.',
    allowedTools: `Bash(${pm} typecheck:*), Bash(${pm} -F * typecheck:*), Bash(${pm} turbo run typecheck:*)`,
    body: `# /typecheck

\`\`\`bash
${typecheckCmd(p)}
\`\`\`

To scope to a workspace, pass its package name in \`$ARGUMENTS\`.
`,
  };
}

function rebuildCmd(ctx: GenerationContext): CommandSpec {
  return {
    description: 'Wipe .claude/ and regenerate from scratch. Destructive — use with care.',
    allowedTools: 'Bash(rm:*), Bash(npx my-claude-team:*), Bash(my-claude-team:*)',
    body: `# /rebuild-ai-setup

**Destructive.** Removes every file in \`.claude/\` (except \`settings.local.json\`) and regenerates them from the current repo profile.

Before running:
1. Confirm there are no uncommitted edits in \`.claude/\` that you want to keep.
2. Read the output of \`/analyze-repo\` — make sure the framework sees your repo correctly.

Then:

\`\`\`bash
rm -rf .claude/agents .claude/skills .claude/commands .claude/INDEX.md CLAUDE.md
npx my-claude-team generate all --force
\`\`\`

For a non-destructive refresh, use \`/create-my-claude-team-member\` instead.
`,
  };
}
