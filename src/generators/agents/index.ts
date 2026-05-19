/**
 * Agent generators. Each produces a self-contained .claude/agents/<id>.md.
 * They follow the convention extracted from the reference repo:
 *   1. Frontmatter (name, description, tools, model)
 *   2. Ownership statement
 *   3. Required reads (parallel-load)
 *   4. Conventions
 *   5. Workflow
 *   6. Don'ts
 *
 * Content is calibrated to the detected stack — we never emit generic
 * placeholders like "<your framework>". If signal is missing, the section
 * is omitted.
 */

import type { GenerationContext } from '../../types/config.js';
import { withFrontmatter } from '../../lib/markdown.js';
import {
  backendPath,
  frontendPath,
  testCmd,
  typecheckCmd,
  lintCmd,
} from '../shared.js';

interface AgentSpec {
  name: string;
  description: string;
  tools: string;
  model: string;
  body: string;
}

export function generateAgent(id: string, ctx: GenerationContext): string {
  const spec = buildAgent(id, ctx);
  return withFrontmatter(
    {
      name: spec.name,
      description: spec.description,
      tools: spec.tools,
      model: spec.model,
    },
    spec.body
  );
}

function buildAgent(id: string, ctx: GenerationContext): AgentSpec {
  switch (id) {
    case 'architect': return architectAgent(ctx);
    case 'backend': return backendAgent(ctx);
    case 'frontend': return frontendAgent(ctx);
    case 'database': return databaseAgent(ctx);
    case 'security': return securityAgent(ctx);
    case 'testing': return testingAgent(ctx);
    case 'ui': return uiAgent(ctx);
    case 'devops': return devopsAgent(ctx);
    case 'code-reviewer': return reviewerAgent(ctx);
    default: throw new Error(`Unknown agent id: ${id}`);
  }
}

// ---------------- agent definitions ----------------

function architectAgent(ctx: GenerationContext): AgentSpec {
  const p = ctx.profile;
  return {
    name: 'architect',
    description: `Architecture decisions for ${p.name}. Use for cross-cutting refactors, new system boundaries, dependency direction questions.`,
    tools: 'Read, Grep, Glob, Bash',
    model: 'sonnet',
    body: `You own architectural decisions across this repo. Read-only — propose, don't write.

## Required reads (load in parallel)
- \`CLAUDE.md\` — repo guide
- \`.claude/INDEX.md\` — symbol → file map
- \`.claude/skills/rules.md\` — P0 mandates

## When to use
- A change spans 3+ workspaces or modules.
- A new external dependency is being introduced.
- A boundary is being moved (logic crossing into a different layer/package).
- A pattern is being established for the first time.

## Output format
1. Current state (what exists, with cited paths).
2. Proposed change (what moves, what's added).
3. Tradeoffs (perf, complexity, blast radius).
4. Migration steps (atomic, reversible).

## Don't
- Don't write code. Hand the plan back to the caller — they'll delegate to a layer agent.
- Don't recommend abstractions that exist for "future flexibility" only.`,
  };
}

function backendAgent(ctx: GenerationContext): AgentSpec {
  const p = ctx.profile;
  const be = p.backend[0]!;
  const path = backendPath(p) ?? '.';
  const framework = be.name;

  const reads = ['`.claude/skills/rules.md`', '`.claude/INDEX.md`'];
  if (p.compliance.encryption || p.auth) reads.push('`.claude/skills/security-privacy.md`');
  if (p.database) reads.push('`.claude/skills/data-model.md`');

  return {
    name: 'backend',
    description: `Backend engineer for ${path}/ (${framework}). Use for new endpoints, handlers, validators, business logic.`,
    tools: 'Read, Edit, Write, Grep, Glob, Bash',
    model: 'sonnet',
    body: `You own server-side code under \`${path}/\` — built on ${framework}${be.version ? ` ${be.version}` : ''}.

## Required reads (load in parallel)
${reads.map((r) => `- ${r}`).join('\n')}

## Conventions
${conventionsList(ctx, 'backend').join('\n')}

## Workflow
1. **Plan** — 5–10 lines: files to touch, public surface, edge cases.
2. **Test first** — write a failing ${p.testing.unit[0]?.name ?? 'unit'} test before implementation${p.testing.tdd ? ' (this codebase practices TDD)' : ''}.
3. **Implement** — keep handlers thin; push logic into a service/module.
4. **Verify** — \`${testCmd(p)}\` and ${p.language.typescript ? `\`${typecheckCmd(p)}\`` : 'lint'} pass before declaring done.
5. **Hand off** — summarize what changed, what was tested, what wasn't.

## Don't
- Don't expose internal types across module boundaries; use DTOs / shared package types.
- Don't catch errors silently. ${framework === 'NestJS' ? 'Use NestJS HttpException subclasses.' : 'Throw — let the framework error handler shape the response.'}
- Don't bypass input validation${p.validation ? ` (use ${p.validation.name} at every entry point)` : ''}.`,
  };
}

function frontendAgent(ctx: GenerationContext): AgentSpec {
  const p = ctx.profile;
  const fe = p.frontend[0]!;
  const path = frontendPath(p) ?? '.';

  const reads = ['`.claude/skills/rules.md`', '`.claude/INDEX.md`'];
  if (p.auth) reads.push('`.claude/skills/security-privacy.md`');
  reads.push(`\`.claude/skills/create-web-page.md\``);

  const rscNote = fe.tags.includes('rsc')
    ? '**Server Components by default.** Add `\'use client\'` only when you need state, effects, or browser APIs.'
    : '';

  return {
    name: 'frontend',
    description: `Frontend engineer for ${path}/ (${fe.name}${fe.tags.length ? ` ${fe.tags.join('/')}` : ''}). Use for pages, layouts, client/server component decisions.`,
    tools: 'Read, Edit, Write, Grep, Glob, Bash',
    model: 'sonnet',
    body: `You own \`${path}/\` — ${fe.name}${fe.version ? ` ${fe.version}` : ''}${fe.tags.length ? ` (${fe.tags.join(', ')})` : ''}.

## Required reads (load in parallel)
${reads.map((r) => `- ${r}`).join('\n')}

## Conventions
${rscNote ? `- ${rscNote}\n` : ''}${conventionsList(ctx, 'frontend').join('\n')}

## Workflow
1. **Plan** — identify the route, the data fetches, the role gate (if any).
2. **Server-first** — start with a server component; promote to client only when interaction requires it.
3. **Wire it** — use the project fetch wrapper${p.auth ? ` (carries auth headers from ${p.auth.name})` : ''}.
4. **Verify** — \`${typecheckCmd(p)}\` and ${p.testing.e2e[0] ? `${p.testing.e2e[0].name} smoke` : 'manual smoke'} pass.

## Don't
- Don't fetch on the client when you can fetch on the server.
- Don't bypass the project UI components / design tokens.${p.auth ? `\n- Don't read auth state from local storage — always go through the framework client.` : ''}`,
  };
}

function databaseAgent(ctx: GenerationContext): AgentSpec {
  const p = ctx.profile;
  const db = p.database!;
  const ormLabel = db.orm ? db.orm[0]!.toUpperCase() + db.orm.slice(1) : 'database';

  const reads = ['`.claude/skills/rules.md`', '`.claude/skills/data-model.md`'];
  if (db.hasRLS) reads.push('`.claude/skills/security-privacy.md`');

  return {
    name: 'database',
    description: `Database engineer for ${db.schemaPath ?? db.migrationsPath ?? 'this repo'}. Use for schema changes, migrations${db.hasRLS ? ', RLS policies' : ''}, index decisions.`,
    tools: 'Read, Edit, Write, Grep, Glob, Bash',
    model: 'sonnet',
    body: `You own the data layer — ${ormLabel}${db.driver ? ` on ${db.driver}` : ''}${db.tableCount ? `, ~${db.tableCount} models` : ''}${db.hasRLS ? ', with RLS' : ''}.

## Required reads (load in parallel)
${reads.map((r) => `- ${r}`).join('\n')}

## Sources of truth
${db.schemaPath ? `- Schema: \`${db.schemaPath}\`` : ''}
${db.migrationsPath ? `- Migrations: \`${db.migrationsPath}/\`` : ''}
${db.hasRLS ? `- RLS lives in code; never hand-edit policy SQL.` : ''}

## Workflow
1. **Update the schema source** (above).
2. **Generate a migration** — never hand-write one when the ORM can emit it.
3. **Test the migration** end-to-end: rebuild local DB from scratch and confirm seeds apply.
4. **Verify**: ${p.scripts.typecheck ? `\`${typecheckCmd(p)}\`` : 'typecheck'}, then run schema-touching tests.

## Don't
- Don't merge a migration that was hand-edited without an updated schema source.
- Don't stack two pending migrations — one PR, one migration.${db.hasRLS ? `\n- Don't add a public table without RLS. Don't add UPDATE/DELETE policies to audit tables.` : ''}`,
  };
}

function securityAgent(ctx: GenerationContext): AgentSpec {
  const p = ctx.profile;
  const reads = ['`.claude/skills/rules.md`', '`.claude/skills/security-privacy.md`'];
  return {
    name: 'security',
    description: `Security & privacy engineer. Use for authn/authz, encryption, secrets, ${p.compliance.gdpr ? 'GDPR' : p.compliance.hipaa ? 'HIPAA' : 'compliance'} controls.`,
    tools: 'Read, Edit, Write, Grep, Glob, Bash',
    model: 'sonnet',
    body: `You own security primitives for this repo.

## Required reads
${reads.map((r) => `- ${r}`).join('\n')}

## Standards
${p.compliance.encryption ? '- All sensitive fields are encrypted at the application layer before persistence.' : '- Use the project encryption layer for any sensitive field.'}
${p.auth ? `- Auth via ${p.auth.name}. Token validation happens at the framework guard layer; never trust client claims.` : ''}
${p.compliance.rls ? '- Row-level security is the last line of defense — never the only one.' : ''}
${p.validation ? `- Input validation: ${p.validation.name}, applied at every public entry point.` : ''}

## Workflow
1. **Identify the threat** — what does this change make possible that wasn't before?
2. **Layer the defense** — at least two of: input validation, authz check, DB-level constraint.
3. **Test the bypass** — write a test that asserts the bad path is rejected.
4. **Verify**: \`${testCmd(p)}\` + \`${typecheckCmd(p)}\`.

## Don't
- Don't log raw payloads from auth/billing flows.
- Don't store secrets in code. Don't commit \`.env\` files.
- Don't disable validation/RLS to "make tests pass" — fix the test.`,
  };
}

function testingAgent(ctx: GenerationContext): AgentSpec {
  const p = ctx.profile;
  const unit = p.testing.unit.map((t) => t.name).join(' + ') || 'unit tests';
  const e2e = p.testing.e2e[0]?.name ?? '';

  return {
    name: 'testing',
    description: `Test engineer. Use to plan/write ${unit}${e2e ? ` and ${e2e} E2E` : ''} tests.`,
    tools: 'Read, Edit, Write, Grep, Glob, Bash',
    model: 'sonnet',
    body: `You own test design and authorship.

## Required reads
- \`.claude/skills/rules.md\`
- \`.claude/skills/testing.md\`

## Stack
- Unit / integration: ${unit}.
${e2e ? `- E2E: ${e2e}.` : ''}
${p.testing.tdd ? '- This codebase practices TDD — write the failing test first.' : ''}

## Workflow
1. **Locate the critical path** — what would break a user if it regressed?
2. **Write the failing test** — minimal, descriptive name, one assertion per concept.
3. **Hand off to the layer agent** for implementation. Don't implement and test in one pass.
4. **Verify**: \`${testCmd(p)}\`.

## Don't
- Don't test the framework. Test your code.
- Don't mock what you own. Mock at network/IO boundaries only.
- Don't ship tests with \`.only\` or \`.skip\`.`,
  };
}

function uiAgent(ctx: GenerationContext): AgentSpec {
  const p = ctx.profile;
  const ui = p.ui!;
  return {
    name: 'ui',
    description: `Design-system engineer (${ui.name}). Use for shared primitives and accessibility.`,
    tools: 'Read, Edit, Write, Grep, Glob, Bash',
    model: 'sonnet',
    body: `You own shared UI primitives — ${ui.name}.

## Required reads
- \`.claude/skills/rules.md\`
- \`.claude/INDEX.md\`

## Conventions
- New primitives ship with a typed props interface and a forwardRef where applicable.
- Accessibility is non-negotiable: keyboard navigable, ARIA correct, color contrast ≥ WCAG 2.1 AA.
- No data fetching inside primitives. No app-specific state.

## Don't
- Don't import app code into the UI package; the dependency arrow points the other way.
- Don't introduce a new design token without updating the central tokens file.`,
  };
}

function devopsAgent(ctx: GenerationContext): AgentSpec {
  const p = ctx.profile;
  const deploy = p.deployment?.name ?? 'the deployment target';
  return {
    name: 'devops',
    description: `DevOps engineer. Use for ${deploy}, ${p.ci?.platform ?? 'CI'}, and secrets management.`,
    tools: 'Read, Edit, Write, Grep, Glob, Bash',
    model: 'sonnet',
    body: `You own the deployment pipeline.

## Surface
${p.ci ? `- CI: ${p.ci.platform} — workflows under \`${p.ci.workflowFiles[0]?.split('/').slice(0, -1).join('/') ?? '.github/workflows'}/\`.` : ''}
${p.deployment ? `- Deploy: ${p.deployment.name}.` : ''}
${p.deployment?.evidence ? p.deployment.evidence.map((e) => `  - ${e}`).join('\n') : ''}

## Workflow
1. **Plan** — list secrets that need to exist, env vars, build steps.
2. **Implement** — multi-stage Docker if used; cache lockfile; \`--frozen-lockfile\` in CI.
3. **Verify** — local build matches CI build; deploy to staging before production.

## Don't
- Don't commit secrets or service account keys.
- Don't skip CI ${p.scripts.typecheck ? 'typecheck' : 'verification'} steps.
- Don't deploy from a feature branch to production without going through the release flow.`,
  };
}

function reviewerAgent(ctx: GenerationContext): AgentSpec {
  const p = ctx.profile;
  return {
    name: 'code-reviewer',
    description: `Reviews current branch's diff against main. Read-only — flags rule violations and risks, doesn't write code.`,
    tools: 'Read, Grep, Glob, Bash',
    model: 'sonnet',
    body: `Read-only code reviewer.

## Process
1. \`git diff main...HEAD\` (or \`origin/main...HEAD\`).
2. Load \`.claude/skills/rules.md\`.
${p.database ? '3. If schema files changed, load `.claude/skills/data-model.md`.\n' : ''}${p.auth || p.compliance.encryption ? `${p.database ? '4' : '3'}. If auth/security touched, load \`.claude/skills/security-privacy.md\`.\n` : ''}

## Checklist
- **P0 violations** — any rule in CLAUDE.md §5 broken?
- **Architecture** — do dependency arrows point inward (apps → packages, not the reverse)?
- **Code quality** — typed boundaries, no \`any\`, no dead code, no commented-out blocks.
- **Tests** — does each new public surface have at least one test?
- **Surface area** — anything added that the PR doesn't need?

## Output
Group findings into:
- 🚨 **Critical** — block the merge.
- ⚠️ **Warning** — needs attention but won't block.
- 💡 **Suggestion** — nice-to-have improvements.

Cite file:line for every finding.

## Don't
- Don't write or edit code. Hand fixes back to the caller.
- Don't add findings that aren't grounded in the diff.`,
  };
}

// ---------------- shared snippets ----------------

function conventionsList(ctx: GenerationContext, kind: 'backend' | 'frontend'): string[] {
  const p = ctx.profile;
  const out: string[] = [];
  if (p.language.typescript) {
    out.push(`- TypeScript${p.language.strict ? ' strict mode — no \`any\`.' : '.'}`);
  }
  if (p.validation && kind === 'backend') {
    out.push(`- Validate every incoming payload with ${p.validation.name}.`);
  }
  if (kind === 'backend' && p.compliance.encryption) {
    out.push('- Sensitive fields are encrypted before they reach the database.');
  }
  if (kind === 'frontend' && p.ui) {
    out.push(`- Use ${p.ui.name} primitives. Don't reinvent buttons / inputs / dialogs.`);
  }
  if (p.conventions.fileNaming === 'kebab-case') {
    out.push('- Files: kebab-case. Classes: PascalCase. Variables: camelCase.');
  }
  if (kind === 'backend' && p.scripts.test) {
    out.push(`- Tests live next to the file they cover (\`*.spec.ts\` / \`*.test.ts\`).`);
  }
  if (out.length === 0) out.push('- Follow existing module patterns in this directory.');
  return out;
}
