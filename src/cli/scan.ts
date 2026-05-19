import { detectProfile } from '../intelligence/index.js';
import { log } from '../lib/log.js';
import type { RepoProfile } from '../types/profile.js';

export interface CliOpts {
  root: string;
  force: boolean;
  dryRun: boolean;
  json: boolean;
  positional: string[];
}

export async function runScan(opts: CliOpts): Promise<void> {
  const profile = await detectProfile(opts.root);

  if (opts.json) {
    process.stdout.write(JSON.stringify(profile, null, 2) + '\n');
    return;
  }

  printProfile(profile);
}

export function printProfile(p: RepoProfile): void {
  log.step(`Scanned ${p.name}`);
  log.dim(`  ${p.root}`);
  log.raw('');

  const lines: [string, string][] = [
    ['Package manager', p.packageManager ?? '—'],
    ['Monorepo', p.monorepo ? `${p.monorepo.tool} (${p.monorepo.workspaces.length} workspaces)` : 'no'],
    ['Language', p.language.typescript ? `TypeScript${p.language.strict ? ' (strict)' : ''}` : 'JavaScript'],
    ['Frontend', p.frontend.map((f) => `${f.name}${f.version ? ` ${f.version}` : ''}${f.tags.length ? ` [${f.tags.join(', ')}]` : ''}`).join(', ') || '—'],
    ['Backend', p.backend.map((f) => `${f.name}${f.version ? ` ${f.version}` : ''}`).join(', ') || '—'],
    ['Database', p.database ? `${p.database.orm ?? '?'} → ${p.database.driver ?? '?'}${p.database.tableCount ? ` (${p.database.tableCount} models)` : ''}${p.database.hasRLS ? ' + RLS' : ''}` : '—'],
    ['Auth', p.auth?.name ?? '—'],
    ['Storage', p.storage?.name ?? '—'],
    ['UI', p.ui?.name ?? '—'],
    ['Validation', p.validation?.name ?? '—'],
    ['Payments', p.payments?.name ?? '—'],
    ['Testing (unit)', p.testing.unit.map((t) => t.name).join(', ') || '—'],
    ['Testing (e2e)', p.testing.e2e.map((t) => t.name).join(', ') || '—'],
    ['CI', p.ci ? `${p.ci.platform} (${p.ci.workflowFiles.length} workflows)` : '—'],
    ['Deployment', p.deployment?.name ?? '—'],
    ['Compliance', formatCompliance(p)],
    ['File naming', p.conventions.fileNaming],
  ];

  for (const [k, v] of lines) {
    log.raw(`  ${k.padEnd(18)} ${v}`);
  }
  log.raw('');

  if (p.monorepo && p.monorepo.workspaces.length > 0) {
    log.raw('  Workspaces:');
    for (const ws of p.monorepo.workspaces) {
      log.raw(`    - ${ws.path}  (${ws.kind}, name: ${ws.name})`);
    }
    log.raw('');
  }

  if (Object.keys(p.scripts).length > 0) {
    log.raw('  Canonical scripts:');
    for (const [k, v] of Object.entries(p.scripts)) {
      log.raw(`    - ${k.padEnd(12)} ${v}`);
    }
  }
}

function formatCompliance(p: RepoProfile): string {
  const tags: string[] = [];
  if (p.compliance.encryption) tags.push('encryption');
  if (p.compliance.auditLogs) tags.push('audit-logs');
  if (p.compliance.rls) tags.push('RLS');
  if (p.compliance.gdpr) tags.push('GDPR');
  if (p.compliance.hipaa) tags.push('HIPAA');
  return tags.length ? tags.join(', ') : '—';
}
