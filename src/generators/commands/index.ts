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
    description: 'Generate or refresh the entire .claude/ AI team for this repository from current code state. Adds missing agents/skills/commands; preserves user-edited files.',
    allowedTools: 'Bash(npx my-claude-team:*), Bash(my-claude-team:*), Read, Edit, Write, Grep, Glob',
    body: `# /create-my-claude-team-member

Generate or refresh the AI team for this repo. Run this when:
- The stack has changed (new framework, new provider, removed service).
- A new domain capability has been added that warrants a specialist agent.
- The \`.claude/\` setup has drifted and needs a clean rebuild.
- You want to add a new custom agent / skill / command.

\`$ARGUMENTS\` (optional): a free-form description of what the new team member should specialize in. If empty, the command refreshes the entire team.

## Procedure

### 1. Scan the repository

Run the CLI to get a fresh \`RepoProfile\`:

\`\`\`bash
npx my-claude-team scan --json > /tmp/mct-profile.json
\`\`\`

Read the resulting JSON. Note any signal that disagrees with what the existing \`.claude/\` files assume (e.g. CLAUDE.md mentions Stripe but no Stripe deps are present).

### 2. Diagnose drift

Read each of these files and compare against the fresh profile:
- \`CLAUDE.md\` — stack sentence (§1), repo map (§2), build commands (§4), hard rules (§5).
- \`.claude/INDEX.md\` — workspace table, database table, skills/commands inventory.
- \`.claude/agents/*.md\` — frontmatter \`description\` should still match the agent's scope.
- \`.claude/skills/*.md\` — required-reads pointers and stack-specific commands.

For each drift point, decide: regenerate (stack-derived), or preserve (user-customized).

### 3. Understand the request (if \`$ARGUMENTS\` is non-empty)

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

\`\`\`bash
npx my-claude-team generate all
\`\`\`

For a single artifact:

\`\`\`bash
npx my-claude-team generate agents
npx my-claude-team generate skills
npx my-claude-team generate commands
npx my-claude-team generate claude-md
\`\`\`

By default the generator **skips files that already exist** (preserves user edits). Pass \`--force\` to overwrite.

For a brand-new custom agent that the generator doesn't know about: write the file directly at \`.claude/agents/<name>.md\` following the convention encoded in the other agent files in this repo.

### 5. Validate

\`\`\`bash
npx my-claude-team doctor
\`\`\`

Reports drift between the current \`.claude/\` setup and the fresh profile.

### 6. Verify

- ${p.scripts.typecheck ? `\`${typecheckCmd(p)}\` — make sure stack-specific commands referenced in generated files still work.` : 'Confirm any commands referenced in generated files still work.'}
- Open one of the generated agent files and read it end-to-end. Does it read project-specific or generic? If generic, that's a generator bug — file an issue rather than hand-editing.

## Don't

- Don't run \`generate all --force\` without reading the diff. Generated files can be wrong; review them like any other PR.
- Don't generate an agent for a stack you don't have. The generator already filters by detected stack; if you find yourself overriding that, your repo probably has hidden complexity worth examining.
- Don't hand-edit generated files for stylistic reasons. Improve the generator instead — that's how the framework gets better for everyone.
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
