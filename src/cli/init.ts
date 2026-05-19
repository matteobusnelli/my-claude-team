import { intro, outro, spinner, text, confirm, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import { detectProfile } from '../intelligence/index.js';
import { generateAll } from '../generators/index.js';
import { DEFAULT_CONFIG, type MyClaudeTeamConfig } from '../types/config.js';
import { log } from '../lib/log.js';
import { printProfile, type CliOpts } from './scan.js';

/**
 * `init` is the first-run flow. By default it is fully non-interactive:
 * scan the repo, use detected defaults, write only files that don't yet
 * exist. This is what most users want — install, run, done.
 *
 * `--interactive` brings back the project-name / description / overwrite
 * prompts for users who want fine control. `--force` always overwrites.
 */
export async function runInit(opts: CliOpts): Promise<void> {
  const interactive = opts.positional.includes('--interactive') ||
    opts.positional.includes('-i');

  intro(pc.bgMagenta(pc.black(' my-claude-team ')) + ' ' + pc.dim('init'));

  // ---- Detect ----
  const s = spinner();
  s.start('Scanning repository');
  const profile = await detectProfile(opts.root);
  s.stop(`Scanned ${pc.bold(profile.name)}`);

  log.raw('');
  printProfile(profile);
  log.raw('');

  // ---- Gather config ----
  const config: MyClaudeTeamConfig = {
    ...DEFAULT_CONFIG,
    projectName: profile.name,
  };

  let mode: 'create' | 'overwrite' | 'skip-if-exists' = opts.force
    ? 'overwrite'
    : 'skip-if-exists';

  if (interactive) {
    const name = await text({
      message: 'Project name (used in CLAUDE.md heading):',
      initialValue: profile.name,
      validate: (v) => (v.trim() ? undefined : 'Required.'),
    });
    if (isCancel(name)) {
      outro(pc.dim('Aborted.'));
      process.exit(0);
    }
    config.projectName = String(name);

    const desc = await text({
      message: 'One-sentence description (or leave blank):',
      placeholder: 'A customer portal for ...',
      initialValue: '',
    });
    if (isCancel(desc)) {
      outro(pc.dim('Aborted.'));
      process.exit(0);
    }
    if (typeof desc === 'string' && desc.trim()) {
      config.projectDescription = String(desc).trim();
    }

    if (!opts.force) {
      const ow = await confirm({
        message: 'Overwrite existing files in .claude/ if present?',
        initialValue: false,
      });
      if (isCancel(ow)) {
        outro(pc.dim('Aborted.'));
        process.exit(0);
      }
      if (ow) mode = 'overwrite';
    }
  }

  // ---- Generate ----
  const s2 = spinner();
  s2.start('Generating .claude/ setup');
  const report = await generateAll(
    { profile, config, target: opts.root },
    { target: 'all', mode, dryRun: opts.dryRun }
  );
  s2.stop(opts.dryRun ? 'Plan ready (dry-run)' : 'Generated');

  // ---- Summary ----
  log.raw('');
  let created = 0, skipped = 0, overwritten = 0;
  for (const r of report.results) {
    const sym =
      r.action === 'created' ? pc.green('+') :
      r.action === 'overwritten' ? pc.yellow('~') :
      r.action === 'skipped' ? pc.dim('·') :
      r.action === 'unchanged' ? pc.dim('=') :
      pc.cyan('m');
    if (r.action === 'created') created++;
    else if (r.action === 'skipped') skipped++;
    else if (r.action === 'overwritten') overwritten++;
    log.raw(`  ${sym} ${pc.dim(`[${r.action}]`)} ${r.path.replace(opts.root + '/', '')}`);
  }
  if (opts.dryRun) {
    log.raw('');
    log.dim(`  ${report.plans.length} files would be written (dry-run, no changes made).`);
  } else {
    log.raw('');
    log.dim(`  ${created} created, ${overwritten} overwritten, ${skipped} skipped.`);
    if (skipped > 0 && !opts.force) {
      log.dim(`  Skipped files already exist. Pass --force to overwrite.`);
    }
  }

  outro(
    opts.dryRun
      ? pc.dim('Dry run complete. Re-run without --dry-run to write files.')
      : pc.green('Done. ') + pc.dim('Open CLAUDE.md and .claude/ to review.')
  );
}
