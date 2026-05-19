import type { GenerationContext } from '../types/config.js';
import { table, section, paragraphs } from '../lib/markdown.js';
import {
  projectLabel,
  stackSentence,
  selectAgents,
  selectSkills,
  selectCommands,
  typecheckCmd,
  testCmd,
  buildCmd,
  devCmd,
  lintCmd,
  hasBackend,
  hasFrontend,
  hasDatabase,
} from './shared.js';

/**
 * Generate the root CLAUDE.md. Follows the 10-section convention extracted
 * from the reference: What this is / Repo map / Scope / Build commands /
 * Hard rules / Skill loading / Subagents / Error handling / Post-impl
 * checklist / Working style.
 *
 * Sections are omitted (not stubbed) when there's no signal to populate them.
 */
export function generateClaudeMd(ctx: GenerationContext): string {
  const { profile, config } = ctx;
  const name = projectLabel(ctx);
  const stack = stackSentence(profile);

  const repoMap = renderRepoMap(ctx);
  const buildCommands = renderBuildCommands(ctx);
  const hardRules = renderHardRules(ctx);
  const skillTable = renderSkillTable(ctx);
  const agentTable = renderAgentTable(ctx);
  const postChecklist = renderPostChecklist(ctx);

  const what = paragraphs(
    `**${name}** — ${config.projectDescription ?? autoDescribe(profile)}`,
    `**Stack:** ${stack}.`
  );

  const scope = `**Editable:**
${editableList(profile)}

**Touch with care (regenerated):**
${regeneratedList(profile)}

**Never modify without explicit ask:**
- \`.git/\`, lockfiles (let the package manager manage), \`node_modules/\``;

  const workingStyle = `- **For any new feature, endpoint, page, schema change, or fix: run \`/feature-workflow\` FIRST.** It is the canonical end-to-end flow with size-based routing.
- Bias to action. Brief plan (≤10 lines), then code. Don't read 20 files before writing one.
- For ambiguous tasks: state your read of the root cause + files you'll touch + assumptions, then implement.
- Prefer editing existing files over creating new ones. Never create duplicate files with the same role.
- When you stop a \`${devCmd(profile)}\`, kill the background process — don't leave it running.`;

  return [
    `# CLAUDE.md`,
    '',
    `Guidance for Claude Code working in this repository. Authoritative — overrides any default behavior.`,
    '',
    `## 1. What this is`,
    '',
    what,
    '',
    `## 2. Repo map`,
    '',
    repoMap,
    '',
    profile.layout.hasDocsDir
      ? `For a fast symbol→path lookup, **read \`.claude/INDEX.md\` before searching the codebase.**`
      : `When navigating, **read \`.claude/INDEX.md\` first** — it's the symbol→file map.`,
    '',
    `## 3. Scope`,
    '',
    scope,
    '',
    `## 4. Build / dev commands (canonical)`,
    '',
    buildCommands,
    '',
    profile.language.typescript
      ? `After ANY edit to \`*.ts\`/\`*.tsx\`, run \`${typecheckCmd(profile)}\` before declaring done. **Don't leave compile errors for the user.**`
      : '',
    '',
    `## 5. Hard rules (P0)`,
    '',
    hardRules,
    '',
    `## 6. Skill loading (on-demand)`,
    '',
    `Match the user's request against the table below. Load matched files in **parallel** with \`Read\` before doing anything else. **Always load \`.claude/skills/rules.md\` for any implementation task.**`,
    '',
    `> **Master entry point for any new work:** if the user asks to implement, add, build, create, scope, or fix anything, run \`/feature-workflow\` FIRST. Don't jump straight to a sub-skill.`,
    '',
    skillTable,
    '',
    `If multiple match, load all in parallel. If none match, proceed with this file alone.`,
    '',
    `## 7. Subagents (delegation)`,
    '',
    `Spawn an agent only when the task is genuinely scoped to one domain and large enough to warrant the cold-start cost.`,
    '',
    agentTable,
    '',
    `Otherwise handle inline. Agents are ~free in tokens but expensive in latency and context.`,
    '',
    section('8. Post-implementation checklist', postChecklist),
    '',
    `## 9. Working style`,
    '',
    workingStyle,
    '',
  ].filter((s): s is string => s !== null && s !== undefined).join('\n');
}

// ---------------- helpers ----------------

function autoDescribe(profile: import('../types/profile.js').RepoProfile): string {
  const bits: string[] = [];
  if (profile.frontend[0] && profile.backend[0]) {
    bits.push(`Full-stack app — ${profile.frontend[0].name} frontend + ${profile.backend[0].name} backend`);
  } else if (profile.frontend[0]) {
    bits.push(`${profile.frontend[0].name} application`);
  } else if (profile.backend[0]) {
    bits.push(`${profile.backend[0].name} service`);
  } else {
    bits.push('TypeScript project');
  }
  if (profile.database) bits.push(`backed by ${profile.database.orm ?? profile.database.driver}`);
  if (profile.auth) bits.push(`auth via ${profile.auth.name}`);
  if (profile.payments) bits.push(`billing via ${profile.payments.name}`);
  return bits.join(', ') + '.';
}

function renderRepoMap(ctx: GenerationContext): string {
  const { profile } = ctx;
  const lines: string[] = ['```'];

  if (profile.monorepo && profile.monorepo.workspaces.length > 0) {
    const maxPath = Math.max(...profile.monorepo.workspaces.map((w) => w.path.length));
    for (const ws of profile.monorepo.workspaces) {
      const pad = ' '.repeat(maxPath - ws.path.length + 2);
      lines.push(`${ws.path}${pad}${describeWorkspace(ws, profile)}`);
    }
  } else {
    if (profile.frontend[0]) lines.push(`src/                 ${profile.frontend[0].name} app`);
    if (profile.backend[0] && profile.frontend.length === 0) lines.push(`src/                 ${profile.backend[0].name} service`);
  }
  if (profile.database?.migrationsPath) {
    lines.push(`${profile.database.migrationsPath}/  database migrations`);
  }
  if (profile.layout.hasDocsDir) lines.push(`docs/                project documentation`);
  lines.push(`.claude/INDEX.md     symbol → file map (read this first for navigation)`);
  lines.push(`.claude/skills/      domain skills loaded on-demand (see §6)`);
  lines.push(`.claude/agents/      specialized subagents (see §7)`);
  lines.push(`.claude/commands/    slash commands`);
  lines.push('```');
  return lines.join('\n');
}

function describeWorkspace(
  ws: { path: string; name: string; kind: string },
  profile: import('../types/profile.js').RepoProfile
): string {
  const fe = profile.frontend.find((f) => f.path === ws.path);
  if (fe) return `${fe.name}${fe.tags.length ? ` (${fe.tags.join(', ')})` : ''}`;
  const be = profile.backend.find((b) => b.path === ws.path);
  if (be) return `${be.name} ${ws.kind}`;
  if (ws.kind === 'package') return `shared package — \`${ws.name}\``;
  return ws.name;
}

function editableList(profile: import('../types/profile.js').RepoProfile): string {
  const items: string[] = [];
  if (profile.monorepo) {
    for (const ws of profile.monorepo.workspaces) {
      items.push(`- \`${ws.path}/\``);
    }
  } else {
    items.push('- `src/`');
  }
  if (profile.database?.migrationsPath) items.push(`- \`${profile.database.migrationsPath}/\``);
  if (profile.layout.hasDocsDir) items.push('- `docs/`');
  items.push('- `.claude/` (when explicitly asked)');
  return items.join('\n');
}

function regeneratedList(profile: import('../types/profile.js').RepoProfile): string {
  const items: string[] = [];
  if (profile.database?.orm === 'prisma') {
    items.push('- `prisma/migrations/` — emitted by `prisma migrate dev`');
  }
  items.push('- `dist/`, `build/`, `.next/`, `.turbo/`, `node_modules/` — build artifacts');
  return items.join('\n');
}

function renderBuildCommands(ctx: GenerationContext): string {
  const { profile } = ctx;
  const lines: string[] = ['```bash', '# Dev'];
  if (profile.scripts.dev) lines.push(profile.scripts.dev);
  lines.push('', '# Verify');
  if (profile.scripts.typecheck) lines.push(profile.scripts.typecheck);
  if (profile.scripts.test) lines.push(profile.scripts.test);
  if (profile.scripts.lint) lines.push(profile.scripts.lint);
  if (profile.scripts.build) {
    lines.push('', '# Build');
    lines.push(profile.scripts.build);
  }
  lines.push('```');
  return lines.join('\n');
}

function renderHardRules(ctx: GenerationContext): string {
  const { profile, config } = ctx;
  const rules: { id: string; title: string; body: string }[] = [];

  // User-defined rules go first.
  for (const r of config.hardRules ?? []) {
    rules.push({ id: r.id, title: r.title, body: r.body });
  }

  // Stack-derived rules.
  if (profile.language.typescript && profile.language.strict) {
    rules.push({
      id: 'ts-strict',
      title: 'TS strict, no `any`',
      body: 'Explicit return types on exported functions.',
    });
  }
  if (profile.validation) {
    rules.push({
      id: 'validate-boundary',
      title: 'Validate at the boundary',
      body: `${profile.validation.name} on every controller/route input.`,
    });
  }
  if (profile.compliance.rls || profile.database?.hasRLS) {
    rules.push({
      id: 'rls-everywhere',
      title: 'RLS on every public table',
      body: 'No exceptions. Row-level security is the last line of defense.',
    });
  }
  if (profile.compliance.auditLogs) {
    rules.push({
      id: 'audit-append-only',
      title: '`audit_logs` is append-only',
      body: 'No UPDATE/DELETE policy for any role, ever.',
    });
  }
  if (profile.compliance.encryption) {
    rules.push({
      id: 'encrypt-sensitive',
      title: 'Encrypt sensitive fields',
      body: 'Use the project encryption layer before persistence — never store PII in plaintext.',
    });
  }
  if (profile.testing.tdd) {
    rules.push({
      id: 'tdd',
      title: 'TDD',
      body: 'Write a failing test before adding production code.',
    });
  }
  rules.push({
    id: 'no-md-files',
    title: 'No new `.md` files unless explicitly asked',
    body: 'Use existing docs; do not create planning/decision docs as a side effect of work.',
  });

  return rules
    .map((r, i) => `${i + 1}. **${r.title}.** ${r.body}`)
    .join('\n');
}

function renderSkillTable(ctx: GenerationContext): string {
  const skills = selectSkills(ctx.profile);
  const rows: { Domain: string; Triggers: string; File: string }[] = [];

  const mapping: Record<string, { Domain: string; Triggers: string }> = {
    rules: { Domain: 'Mandatory rules', Triggers: 'any implementation task' },
    'feature-workflow': {
      Domain: '**Master workflow — entry point for any new work**',
      Triggers: '`/feature-workflow`, `implement`, `add feature`, `build`, `create`, `start working on`',
    },
    'start-feature': { Domain: 'Plan a non-trivial feature', Triggers: '`start feature`, `plan dir`, `backlog`' },
    'implement-feature': { Domain: 'Full-stack orchestrator', Triggers: 'after plan approved, `phased implementation`' },
    'create-api-feature': { Domain: 'New API endpoint / module', Triggers: '`endpoint`, `controller`, `service`, `route handler`' },
    'create-web-page': { Domain: 'New page / route', Triggers: '`page`, `route`, `RSC`, `client component`' },
    'data-model': { Domain: 'Database & schema', Triggers: '`schema`, `migration`, `data-model`' },
    'security-privacy': { Domain: 'Security & privacy', Triggers: '`auth`, `RBAC`, `encryption`, `GDPR`, `JWT`' },
    testing: { Domain: 'Testing', Triggers: '`test`, `TDD`, fixtures' },
    bugfix: { Domain: 'Bug fix workflow', Triggers: '`bug`, `fix`, `broken`, `regression`, `/bugfix`' },
    'incident-review': { Domain: 'Production-risk review', Triggers: '`/incident-review`, `production risk`, pre-merge gate' },
  };

  for (const id of skills) {
    const m = mapping[id];
    if (!m) continue;
    rows.push({ ...m, File: `\`.claude/skills/${id}.md\`` });
  }

  return table(['Domain', 'Triggers', 'File'], rows);
}

function renderAgentTable(ctx: GenerationContext): string {
  const agents = selectAgents(ctx.profile);
  const mapping: Record<string, string> = {
    architect: 'High-level architecture decisions, cross-cutting refactors',
    backend: 'Server-side modules, controllers, services, validators',
    frontend: 'Pages, layouts, middleware, client/server component decisions',
    database: 'Schema, migrations, query design, indexes',
    security: 'Authn/authz, encryption, secrets, GDPR/HIPAA controls',
    testing: 'Test plan, fixtures, critical-path coverage',
    ui: 'Design system primitives, accessibility',
    devops: 'Docker, CI/CD, deployment configs, secrets',
    'code-reviewer': 'Pre-commit / pre-merge review on the current branch (read-only)',
  };
  const rows = agents.map((id) => ({
    Agent: `\`${id}\``,
    'When to use': mapping[id] ?? '—',
  }));
  return table(['Agent', 'When to use'], rows);
}

function renderPostChecklist(ctx: GenerationContext): string {
  const { profile } = ctx;
  const items: string[] = [];
  if (profile.scripts.typecheck) items.push(`1. \`${profile.scripts.typecheck}\` for every touched package.`);
  if (profile.scripts.test) items.push(`${items.length + 1}. \`${profile.scripts.test}\` for every touched package.`);
  if (profile.database?.orm === 'prisma') {
    items.push(`${items.length + 1}. If schema changed: rebuild local DB from scratch to confirm migrations apply.`);
  }
  if (profile.auth) {
    items.push(`${items.length + 1}. Auth flows: trace login → middleware → dashboard for each role; confirm tokens are sent.`);
  }
  if (profile.database?.hasRLS) {
    items.push(`${items.length + 1}. If new tables/columns: confirm RLS is enabled and policies cover every operation each role needs.`);
  }
  items.push(`${items.length + 1}. Stop any background dev server you started.`);
  return items.join('\n');
}
