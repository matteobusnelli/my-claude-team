import type { GenerationContext } from '../types/config.js';
import { table } from '../lib/markdown.js';
import { selectAgents, selectSkills, selectCommands } from './shared.js';

/**
 * Generate .claude/INDEX.md — the symbol→file map. The reference repo uses
 * this as its first navigation aid; we replicate the pattern but populate it
 * from RepoProfile rather than a hand-curated table.
 */
export function generateIndexMd(ctx: GenerationContext): string {
  const { profile } = ctx;

  const sections: string[] = [
    `# Repo Navigation Index`,
    '',
    `Symbol/concept → file. Use this before grepping. Updated when paths change.`,
    '',
  ];

  if (profile.layout.hasDocsDir) {
    sections.push('## Top-level docs');
    sections.push('');
    sections.push('See `docs/` for project-specific documentation.');
    sections.push('');
  }

  if (profile.monorepo && profile.monorepo.workspaces.length > 0) {
    sections.push('## Workspaces');
    sections.push('');
    sections.push(
      table(
        ['Path', 'Kind', 'Package name'],
        profile.monorepo.workspaces.map((w) => ({
          Path: `\`${w.path}\``,
          Kind: w.kind,
          'Package name': `\`${w.name}\``,
        }))
      )
    );
    sections.push('');
  }

  if (profile.database) {
    sections.push('## Database');
    sections.push('');
    const rows: { Concern: string; Path: string }[] = [];
    if (profile.database.schemaPath) rows.push({ Concern: 'Schema source of truth', Path: `\`${profile.database.schemaPath}\`` });
    if (profile.database.migrationsPath) rows.push({ Concern: 'Migrations', Path: `\`${profile.database.migrationsPath}/\`` });
    if (profile.database.tableCount) rows.push({ Concern: 'Approx. table count', Path: String(profile.database.tableCount) });
    if (profile.database.hasRLS) rows.push({ Concern: 'Row-level security', Path: 'enabled' });
    sections.push(table(['Concern', 'Path'], rows));
    sections.push('');
  }

  // Skills + commands inventory
  const skillRows = selectSkills(profile).map((id) => ({
    Skill: `\`.claude/skills/${id}.md\``,
    Purpose: skillPurpose(id),
  }));
  sections.push('## Skills (AI workflows)');
  sections.push('');
  sections.push(table(['Skill', 'Purpose'], skillRows));
  sections.push('');

  const cmdRows = selectCommands(profile).map((id) => ({
    Command: `\`/${id}\``,
    Purpose: commandPurpose(id),
  }));
  sections.push('## Slash commands');
  sections.push('');
  sections.push(table(['Command', 'Purpose'], cmdRows));
  sections.push('');

  const agentRows = selectAgents(profile).map((id) => ({
    Agent: `\`${id}\``,
    Scope: agentScope(id),
  }));
  sections.push('## Subagents');
  sections.push('');
  sections.push(table(['Agent', 'Scope'], agentRows));
  sections.push('');

  if (profile.ci) {
    sections.push('## CI & quality');
    sections.push('');
    sections.push(`- Platform: \`${profile.ci.platform}\``);
    for (const f of profile.ci.workflowFiles) sections.push(`- Workflow: \`${f}\``);
    if (profile.conventions.hasEslint) sections.push('- Linter: ESLint');
    if (profile.conventions.hasPrettier) sections.push('- Formatter: Prettier');
    sections.push('');
  }

  return sections.join('\n');
}

function skillPurpose(id: string): string {
  return {
    rules: 'P0 mandates — load for every implementation task',
    'feature-workflow': 'Master end-to-end workflow; size-based routing',
    'start-feature': 'Bootstrap a plan dir for a non-trivial feature',
    'implement-feature': 'Full-stack orchestrator across schema → backend → frontend',
    'create-api-feature': 'Pattern for new server-side modules',
    'create-web-page': 'Pattern for new client/server pages',
    'data-model': 'Schema, migrations, relationships reference',
    'security-privacy': 'Auth, RBAC, encryption, GDPR/HIPAA controls',
    testing: 'Test strategy, fixtures, critical-path catalog',
    bugfix: 'Reproduce → diagnose → minimal fix → verify',
    'incident-review': 'Production-risk audit framework',
  }[id] ?? '—';
}

function commandPurpose(id: string): string {
  return {
    'create-my-claude-team-member': 'Generate / refresh this entire AI setup from current repo state',
    'analyze-repo': 'Print the detected RepoProfile',
    'feature-workflow': 'Master entry point for any new work',
    bugfix: 'Systematic bug-fix workflow',
    'code-review': 'Invoke the code-reviewer agent on current branch',
    'incident-review': 'Production-risk review of current branch or a PR',
    typecheck: 'Run TypeScript typecheck (scoped or full)',
    'rebuild-ai-setup': 'Wipe and re-generate .claude/ from scratch',
  }[id] ?? '—';
}

function agentScope(id: string): string {
  return {
    architect: 'Cross-cutting design decisions',
    backend: 'Server-side modules + handlers',
    frontend: 'Pages, layouts, middleware',
    database: 'Schema + migrations + queries',
    security: 'Authn/authz, encryption, GDPR',
    testing: 'Test plan + fixtures',
    ui: 'Design-system primitives + a11y',
    devops: 'Containers, CI/CD, deploy configs',
    'code-reviewer': 'Read-only diff review',
  }[id] ?? '—';
}
