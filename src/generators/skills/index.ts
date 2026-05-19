/**
 * Skill generators. Skills are markdown files loaded into Claude's context
 * on-demand (see the trigger table in CLAUDE.md §6). Each skill is
 * self-contained and follows the convention extracted from the reference:
 *   Preamble (when to use, what this is NOT) → Required reads →
 *   Procedure (steps + gates) → Don'ts.
 *
 * Skills are emitted only when the underlying signal exists. e.g.
 * `data-model.md` is skipped when no DB is detected.
 */

import type { GenerationContext } from '../../types/config.js';
import { withFrontmatter } from '../../lib/markdown.js';
import {
  backendPath,
  frontendPath,
  testCmd,
  typecheckCmd,
  buildCmd,
  devCmd,
  lintCmd,
  projectLabel,
} from '../shared.js';

interface SkillSpec {
  name: string;
  description: string;
  body: string;
}

export function generateSkill(id: string, ctx: GenerationContext): string {
  const spec = buildSkill(id, ctx);
  return withFrontmatter({ name: spec.name, description: spec.description }, spec.body);
}

function buildSkill(id: string, ctx: GenerationContext): SkillSpec {
  switch (id) {
    case 'rules': return rulesSkill(ctx);
    case 'feature-workflow': return featureWorkflowSkill(ctx);
    case 'start-feature': return startFeatureSkill(ctx);
    case 'implement-feature': return implementFeatureSkill(ctx);
    case 'create-api-feature': return createApiFeatureSkill(ctx);
    case 'create-web-page': return createWebPageSkill(ctx);
    case 'data-model': return dataModelSkill(ctx);
    case 'security-privacy': return securityPrivacySkill(ctx);
    case 'testing': return testingSkill(ctx);
    case 'bugfix': return bugfixSkill(ctx);
    case 'incident-review': return incidentReviewSkill(ctx);
    default: throw new Error(`Unknown skill id: ${id}`);
  }
}

// ---------------- skills ----------------

function rulesSkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;
  const items: string[] = [];

  if (p.language.typescript && p.language.strict) {
    items.push('- **TypeScript strict.** Explicit return types on exports. No `any`.');
  }
  if (p.validation) {
    items.push(`- **Validate at the boundary.** ${p.validation.name} on every public entry point.`);
  }
  if (p.compliance.rls || p.database?.hasRLS) {
    items.push('- **RLS on every public table.** No exceptions.');
  }
  if (p.compliance.auditLogs) {
    items.push('- **`audit_logs` is append-only.** No UPDATE/DELETE policy for any role.');
  }
  if (p.compliance.encryption) {
    items.push('- **Encrypt sensitive fields** via the project encryption layer before persistence.');
  }
  if (p.auth) {
    items.push(`- **Authz at multiple layers** — never rely on a single gate.`);
  }
  if (p.testing.tdd) {
    items.push('- **TDD.** Failing test before production code.');
  }
  items.push('- **No new `.md` files** unless explicitly asked.');
  items.push('- **Edit existing files** rather than creating duplicates.');

  return {
    name: 'rules',
    description: 'Mandatory rules that override agent behavior. Load for every implementation task.',
    body: `# P0 Rules

Non-negotiable. These override every agent's working defaults.

${items.join('\n')}

## Working principles

- Bias to action: brief plan, then code. Don't read 20 files before writing one.
- Prefer editing existing files over creating new ones.
- Match the scope of the change to the request. No drive-by refactors.
- After any TypeScript edit: \`${typecheckCmd(p)}\` before declaring done.
`,
  };
}

function featureWorkflowSkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;
  const hasBE = p.backend.length > 0;
  const hasFE = p.frontend.length > 0;

  return {
    name: 'feature-workflow',
    description: 'Master end-to-end workflow. Size decision → routing → verification → PR. Entry point for all new work.',
    body: `# Feature workflow (master)

The single entry point for any new feature, endpoint, page, schema change, or fix.

## Step 1 — Size decision

| Path | When | Skills loaded |
|---|---|---|
| **A** Small / single-layer | Adds one endpoint, one page, or one schema change with no cross-cutting impact. | ${[hasBE && '`create-api-feature`', hasFE && '`create-web-page`', p.database && '`data-model`'].filter(Boolean).join(' / ')} |
| **B** Non-trivial | Spans 2+ layers, or has new domain entities. | \`start-feature\` → \`implement-feature\` |
| **C** Bug | Existing behavior is wrong. | \`bugfix\` |

Pick the smallest path that fits — don't over-engineer.

## Path A (small)

1. Load the single relevant pattern skill from the table above.
2. Implement following its procedure.
3. Run verification gates (below).
4. Open the PR.

## Path B (non-trivial)

1. Load \`start-feature\` — bootstrap \`docs/plans/<slug>/\` with \`plan.md\` + \`backlog.md\`.
2. Get the plan approved by the user before any code.
3. Load \`implement-feature\` — phased execution across schema → ${hasBE ? 'backend → ' : ''}${hasFE ? 'frontend → ' : ''}verification.
4. Run verification gates.
5. Open the PR with a link to the plan dir.

## Path C (bug)

1. Load \`bugfix\` and follow its 6-step procedure.
2. The fix lands with a regression test that proves the original symptom.

## Verification gates (every path)

- ${p.scripts.typecheck ? `\`${typecheckCmd(p)}\`` : 'typecheck'} on every touched workspace.
- ${p.scripts.test ? `\`${testCmd(p)}\`` : 'test'} for every touched workspace.
${p.scripts.lint ? `- \`${lintCmd(p)}\`\n` : ''}${p.database ? '- If schema changed: rebuild local DB from scratch, confirm migrations apply.\n' : ''}- Stop any background dev server you started.

## Don't

- Don't skip step 1. Picking the wrong path costs more than measuring twice.
- Don't bundle unrelated changes into one PR.
- Don't call \`/code-review\` to "find work" — only after you believe the change is done.
`,
  };
}

function startFeatureSkill(ctx: GenerationContext): SkillSpec {
  return {
    name: 'start-feature',
    description: 'Bootstrap a docs/plans/<slug>/ directory for a non-trivial feature. Plan only — no code.',
    body: `# Start a feature (plan stage)

Path B step 1. Output is a plan directory, not code.

## Procedure

1. **Parse the brief** — name, scope, success criteria, out-of-scope items.
2. **Skim the affected code** — list the files/modules involved. Don't open >20.
3. **Bootstrap** \`docs/plans/<slug>/\` (kebab-case slug):
   - \`plan.md\` — problem, approach, phases, risks, out-of-scope.
   - \`backlog.md\` — ordered user stories with acceptance criteria.
   - \`summary.md\` — one-paragraph TL;DR (kept current as the work progresses).
4. **Stop.** Wait for user approval before any implementation.

## Don't

- Don't write code. Don't write tests. Just plan.
- Don't list every possible edge case. List the ones that change the design.
- Don't propose more than 3 phases. If you need 5, the feature is too big — propose splitting.
`,
  };
}

function implementFeatureSkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;
  const hasBE = p.backend.length > 0;
  const hasFE = p.frontend.length > 0;
  const hasDB = p.database !== null;

  const phases: string[] = [];
  let n = 1;
  phases.push(`${n++}. **Understand** — re-read \`docs/plans/<slug>/plan.md\`. If it's stale, stop and ask.`);
  if (hasDB) phases.push(`${n++}. **Schema** — ${p.database!.orm ?? 'ORM'} changes first; generate migration; rebuild local DB; gate: schema tests pass.`);
  if (hasBE) phases.push(`${n++}. **Backend** — delegate to \`create-api-feature\` per endpoint; gate: \`${testCmd(p)}\` passes.`);
  if (hasFE) phases.push(`${n++}. **Frontend** — delegate to \`create-web-page\` per route; gate: \`${typecheckCmd(p)}\`.`);
  phases.push(`${n++}. **Verify** — full pipeline${p.testing.e2e[0] ? `, including ${p.testing.e2e[0].name} smoke` : ''}.`);
  phases.push(`${n++}. **Report** — diff summary, what was tested, anything left open.`);

  return {
    name: 'implement-feature',
    description: 'Phased full-stack orchestrator. Use after the plan is approved. Delegates to layer skills.',
    body: `# Implement a feature (full stack)

Path B step 3. The plan dir at \`docs/plans/<slug>/\` is the contract.

## Phases (each is a gate — don't proceed if it fails)

${phases.join('\n')}

## Key rules

- **One PR, one plan.** Don't merge mid-plan unless explicitly scoped.
- **Don't skip auth flows.** If the feature introduces a new role / permission, trace login → middleware → page for every actor before declaring done.
${hasDB ? '- **Don\'t stack broken migrations.** If migration N is wrong, fix N — don\'t add N+1.\n' : ''}- **Update the plan as you learn.** A stale plan is worse than no plan.

## Don't

- Don't open a PR if any phase gate is red.
- Don't introduce a new dependency without flagging it in the PR description.
`,
  };
}

function createApiFeatureSkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;
  const be = p.backend[0]!;
  const path = backendPath(p) ?? '.';
  const fw = be.name;

  return {
    name: 'create-api-feature',
    description: `Pattern for adding a new ${fw} endpoint/module under ${path}/. Loaded for Path A backend work.`,
    body: `# Create an API feature

Use when: adding a new endpoint or module to \`${path}/\` (${fw}${be.version ? ` ${be.version}` : ''}).

## Canonical folder shape

Follow the existing module structure under \`${path}/\`. Sample one neighbor before adding yours.

## Required reads

- \`.claude/skills/rules.md\`
- \`.claude/skills/data-model.md\` (if your endpoint touches new entities)
- \`.claude/skills/security-privacy.md\` (if your endpoint is authenticated)

## Procedure

1. **Plan** — list the new files, the public route, the auth requirement, the validation schema.
2. **Schema** — if the data model changes, do that FIRST (delegate to \`data-model\` workflow).
${p.validation ? `3. **Validation schema** — define ${p.validation.name} schemas at the module boundary.\n` : ''}4. **Service test (TDD)** — write a failing ${p.testing.unit[0]?.name ?? 'unit'} test for the new behavior.
5. **Service implementation** — make the test pass; keep handlers thin.
6. **Handler** — wire to the route, decorate with auth/validation${p.validation ? ` (${p.validation.name})` : ''}.
7. **Verify** — \`${testCmd(p)}\` and \`${typecheckCmd(p)}\` both green.
8. **Update** \`.claude/INDEX.md\` if you added a new module — keep the symbol map honest.

## Don't

- Don't expose raw entities — return DTOs.
- Don't skip error shaping. Use the project's exception type, not ad-hoc \`throw new Error\`.
${p.compliance.encryption ? '- Don\'t persist sensitive fields without going through the encryption layer.\n' : ''}`,
  };
}

function createWebPageSkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;
  const fe = p.frontend[0]!;
  const path = frontendPath(p) ?? '.';

  return {
    name: 'create-web-page',
    description: `Pattern for adding a new page/route in ${path}/ (${fe.name}). Loaded for Path A frontend work.`,
    body: `# Create a page / route

Use when: adding a new page or route segment to \`${path}/\` (${fe.name}${fe.tags.length ? ` ${fe.tags.join('/')}` : ''}).

## Required reads

- \`.claude/skills/rules.md\`
- \`.claude/skills/security-privacy.md\` (if the route is authenticated)

## Decision flow (RSC vs client)

${fe.tags.includes('rsc') ? `**Default to a Server Component.** Promote to \`'use client'\` only when you need:
- React state or refs
- Browser-only APIs (window, document, IntersectionObserver, etc.)
- Event handlers that need a client closure` : `Use the simplest component type that works. Avoid unnecessary client-side state.`}

## Procedure

1. **Plan** — route path, data fetches, role gate (if any), interactive behavior.
2. **Page** — write the route file. Keep it presentation-only; push logic into a server function or a hook.
3. **Data** — fetch via the project's fetch wrapper${p.auth ? ` (handles ${p.auth.name} auth headers)` : ''}.
4. **Empty / error states** — handle them; never ship a page that crashes on empty data.
5. **Verify** — \`${typecheckCmd(p)}\` and a manual smoke run (\`${devCmd(p)}\`).
${p.testing.e2e[0] ? `6. **E2E smoke** — add a ${p.testing.e2e[0].name} test for the happy path.\n` : ''}

## Don't

- Don't fetch on the client when the server can do it.
- Don't import server-only modules into client components.${p.ui ? `\n- Don't reinvent components that exist in ${p.ui.name}.` : ''}
`,
  };
}

function dataModelSkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;
  const db = p.database!;
  return {
    name: 'data-model',
    description: `Schema reference for ${db.orm ?? db.driver ?? 'the database'}. Migration discipline, RLS expectations.`,
    body: `# Data model

${db.schemaPath ? `**Source of truth:** \`${db.schemaPath}\` (${db.orm ?? 'schema'}).` : ''}
${db.migrationsPath ? `**Migrations:** \`${db.migrationsPath}/\`.` : ''}
${db.tableCount ? `**Approx. table count:** ${db.tableCount}.` : ''}
${db.hasRLS ? '**Row-level security:** enabled. Policies live in code and are generated into migrations.' : ''}

## Migration discipline

1. Edit the schema source.
2. Generate the migration via the ORM CLI (never hand-write SQL when avoidable).
3. Rebuild the local database from scratch to confirm the migration applies cleanly.
4. Open the PR with both the schema diff and the generated migration.

## Conventions

- One PR adds at most one migration.
- Migrations are forward-only — no downgrade scripts.
${db.hasRLS ? '- Every new public table gets an RLS policy in the same PR.\n' : ''}- Schema-touching tests must pass before merge.

## Don't

- Don't edit a committed migration. Add a new one.
- Don't drop columns containing data without a planned data move.
${p.compliance.auditLogs ? '- Don\'t add UPDATE/DELETE policies to audit tables.' : ''}
`,
  };
}

function securityPrivacySkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;
  return {
    name: 'security-privacy',
    description: 'Auth, RBAC, encryption, secrets, GDPR/HIPAA controls.',
    body: `# Security & privacy

${p.auth ? `## Authentication

Auth provider: **${p.auth.name}**${p.auth.evidence ? ` (${p.auth.evidence.join(', ')})` : ''}.

- Token validation runs at the framework guard layer, before any handler logic.
- Never trust client claims — always derive identity from the verified token.
` : ''}

## Authorization
${p.compliance.rls ? `- Three layers when applicable: route gate → handler guard → row-level security.\n` : ''}- Each layer is independent. A bug in one must not silently disable the others.

${p.compliance.encryption ? `## Encryption

- Sensitive fields are encrypted at the application layer **before** persistence.
- The encryption key lives in env vars only — never in code, never in fixtures.
` : ''}

${p.compliance.gdpr ? `## GDPR

- Minimize data collected: only what the feature requires.
- DTOs are the public contract — don't leak internal fields.
- Audit logs are append-only and cover every data-modifying operation.
` : ''}
${p.compliance.hipaa ? `## HIPAA

- Treat all PHI as sensitive. Encryption in transit AND at rest.
- BAAs must be in place for every third-party that touches PHI.
` : ''}

## Secrets

- Never commit secrets. Use env vars + secrets manager.
- \`.env\` files are gitignored.${p.deployment ? ` Deploy secrets via the ${p.deployment.name} secrets API.` : ''}
- Never log raw payloads from auth or billing flows.

${p.validation ? `## Input validation

- Every public entry point validates with ${p.validation.name}.
- Validation runs at the framework boundary — services trust their inputs.
` : ''}
`,
  };
}

function testingSkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;
  const unit = p.testing.unit.map((t) => t.name).join(' + ') || 'unit framework';
  const e2e = p.testing.e2e[0]?.name;

  return {
    name: 'testing',
    description: 'Test strategy + critical-path catalog.',
    body: `# Testing

## Stack

- Unit / integration: **${unit}**.
${e2e ? `- E2E: **${e2e}**.` : ''}
${p.testing.tdd ? '- This codebase practices TDD — write the failing test first.' : ''}

## Layers

- **Unit** — pure functions, services, validators. Fast, no I/O.
- **Integration** — wire to a real database (or in-memory equivalent). Test the contract.
${e2e ? `- **E2E (${e2e})** — boot the app; click through the happy path.` : ''}

## Critical paths to cover

${criticalPaths(ctx).map((p) => `- ${p}`).join('\n')}

## Don't

- Don't test the framework. Test your code.
- Don't ship \`.only\` or \`.skip\`.
- Don't mock what you own. Mock at network / IO boundaries.
`,
  };
}

function criticalPaths(ctx: GenerationContext): string[] {
  const p = ctx.profile;
  const out: string[] = [];
  if (p.auth) out.push(`Auth: a request without a valid token gets ${p.backend[0]?.name === 'NestJS' ? '401' : 'rejected'}.`);
  if (p.compliance.rls) out.push('Row isolation: a user cannot read another user\'s rows.');
  if (p.compliance.auditLogs) out.push('Audit immutability: UPDATE/DELETE on `audit_logs` is rejected by the DB.');
  if (p.compliance.encryption) out.push('Encryption roundtrip: a stored value is unreadable in the DB and recoverable through the service.');
  if (p.validation) out.push(`Validation: malformed payloads are rejected by ${p.validation.name} with a 4xx, not crashing the server.`);
  if (p.payments) out.push(`${p.payments.name} webhook: invalid signatures are rejected.`);
  if (out.length === 0) out.push('Happy path for each public surface.');
  return out;
}

function bugfixSkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;
  return {
    name: 'bugfix',
    description: 'Systematic bug-fix workflow. Reproduce → diagnose → fix → verify.',
    body: `# Bugfix

## Procedure

1. **Reproduce** — write the minimal command, payload, or click-path that triggers the bug. If you can't reproduce, you can't fix.
2. **Diagnose** — locate the root cause. Don't patch symptoms.
3. **Test** — write a failing test that captures the bug.
4. **Fix** — minimal change to make the test pass. Don't refactor on the way.
5. **Verify auth/redirects** — if the fix touched auth, trace login → middleware → handler for every affected role.
6. **Report** — diff summary, what was tested, any follow-ups that fall out of scope.

## Verification

- \`${testCmd(p)}\` passes (including your new regression test).
- \`${typecheckCmd(p)}\` clean.

## Autonomous mode (when the user says "just fix it")

Skip the report step; ship the diff. Still write the regression test.

## Don't

- Don't expand scope. The PR fixes the bug — nothing else.
- Don't disable the failing test to "unblock" yourself. Fix the cause.
`,
  };
}

function incidentReviewSkill(ctx: GenerationContext): SkillSpec {
  const p = ctx.profile;

  const categories: string[] = [];
  if (p.compliance.rls) categories.push('**RLS bypass** — new public tables without policies, or policies that grant too much.');
  if (p.compliance.auditLogs) categories.push('**Audit tampering** — UPDATE/DELETE policies appearing on audit tables.');
  if (p.auth) categories.push(`**RBAC drops** — handler missing a role guard, or middleware whitelisting a sensitive path.`);
  if (p.compliance.encryption) categories.push('**Encryption regression** — a sensitive field written without going through the encryption service.');
  if (p.payments) categories.push(`**${p.payments.name} webhook** — signature verification removed, raw body parsed twice, missing idempotency.`);
  if (p.storage) categories.push(`**${p.storage.name} signed URLs** — missing expiry, public bucket usage, leaked URLs in logs.`);
  if (p.database) categories.push('**Migration safety** — irreversible drops, unindexed FKs, missing NOT NULL on hot paths.');
  categories.push('**Secret leakage** — keys committed, env files staged, secrets logged.');
  if (p.deployment) categories.push(`**${p.deployment.name} drift** — deploy config changes without a rollback plan.`);

  return {
    name: 'incident-review',
    description: 'Production-risk audit. Read-only. Run before merge for any non-trivial change.',
    body: `# Incident review

Read-only audit against ${categories.length} risk categories. Not a code review — this is a production-safety gate.

## When to use

- Before merging anything that touches auth, data, billing, or migrations.
- After a P0 incident, on the suspected commit.
- Periodically on \`main\` to surface drift.

## Procedure

1. \`git diff main...HEAD\` (or \`gh pr diff <PR#>\`).
2. Load \`.claude/skills/rules.md\` and any topic skills relevant to the diff.
3. Walk each risk category below — for each, either confirm "no risk" or flag with file:line.
4. Produce a structured report: 🚨 Critical / ⚠️ Warning / ✅ OK per category.

## Risk categories

${categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Don't

- Don't modify code. If you spot a fix, file it as a finding.
- Don't lower the bar to "ship the PR". Critical findings block merge.
`,
  };
}
