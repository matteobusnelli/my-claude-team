import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { detectProfile } from '../intelligence/index.js';
import { readMaybe } from '../lib/fs.js';
import { log } from '../lib/log.js';
import { selectAgents, selectSkills, selectCommands } from '../generators/shared.js';
import type { CliOpts } from './scan.js';

/**
 * Compare the existing .claude/ tree against what would be generated for the
 * current repo state. Flag drift (missing files, stale content) without
 * touching anything.
 */
export async function runDoctor(opts: CliOpts): Promise<void> {
  const profile = await detectProfile(opts.root);
  const findings: { level: 'err' | 'warn' | 'ok'; msg: string }[] = [];

  const exists = (rel: string) => existsSync(join(opts.root, rel));

  if (!exists('CLAUDE.md')) findings.push({ level: 'err', msg: 'CLAUDE.md is missing — run `init`.' });
  else findings.push({ level: 'ok', msg: 'CLAUDE.md present.' });

  if (!exists('.claude/INDEX.md')) findings.push({ level: 'warn', msg: '.claude/INDEX.md is missing.' });
  else findings.push({ level: 'ok', msg: '.claude/INDEX.md present.' });

  if (!exists('.claude/settings.local.json')) {
    findings.push({ level: 'warn', msg: '.claude/settings.local.json is missing.' });
  }

  // Expected agents/skills/commands per current stack
  for (const id of selectAgents(profile)) {
    const path = `.claude/agents/${id}.md`;
    if (!exists(path)) findings.push({ level: 'warn', msg: `Missing agent (expected for this stack): ${path}` });
  }
  for (const id of selectSkills(profile)) {
    const path = `.claude/skills/${id}.md`;
    if (!exists(path)) findings.push({ level: 'warn', msg: `Missing skill: ${path}` });
  }
  for (const id of selectCommands(profile)) {
    const path = `.claude/commands/${id}.md`;
    if (!exists(path)) findings.push({ level: 'warn', msg: `Missing command: ${path}` });
  }

  // Light drift checks: does CLAUDE.md still mention the same package manager?
  const claudeMd = await readMaybe(join(opts.root, 'CLAUDE.md'));
  if (claudeMd && profile.packageManager) {
    if (!claudeMd.includes(profile.packageManager)) {
      findings.push({
        level: 'warn',
        msg: `CLAUDE.md doesn't mention the detected package manager (${profile.packageManager}). Possible drift.`,
      });
    }
  }

  log.step(`Doctor — ${profile.name}`);
  log.raw('');
  let errs = 0, warns = 0, oks = 0;
  for (const f of findings) {
    const sym = f.level === 'err' ? pc.red('✗') : f.level === 'warn' ? pc.yellow('!') : pc.green('✓');
    log.raw(`  ${sym} ${f.msg}`);
    if (f.level === 'err') errs++; else if (f.level === 'warn') warns++; else oks++;
  }
  log.raw('');
  log.raw(`  ${oks} ok, ${warns} warnings, ${errs} errors.`);
  if (errs > 0) process.exit(1);
}
