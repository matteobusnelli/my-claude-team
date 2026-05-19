import { intro, outro, text, confirm, isCancel, spinner } from '@clack/prompts';
import pc from 'picocolors';
import { detectProfile } from '../intelligence/index.js';
import { generateAll } from '../generators/index.js';
import { DEFAULT_CONFIG, type MyClaudeTeamConfig } from '../types/config.js';
import { log } from '../lib/log.js';
import { printProfile, type CliOpts } from './scan.js';

/**
 * `init` is the first-run flow. It detects the stack, lets the user override
 * the project name + description, asks whether to overwrite existing setup,
 * then runs the full generator and prints a summary.
 */
export async function runInit(opts: CliOpts): Promise<void> {
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
  const projectName = await text({
    message: 'Project name (used in CLAUDE.md heading):',
    initialValue: profile.name,
    validate: (v) => (v.trim() ? undefined : 'Required.'),
  });
  if (isCancel(projectName)) {
    outro(pc.dim('Aborted.'));
    process.exit(0);
  }

  const projectDescription = await text({
    message: 'One-sentence description of what this project is (or leave blank):',
    placeholder: 'A customer portal for ...',
    initialValue: '',
  });
  if (isCancel(projectDescription)) {
    outro(pc.dim('Aborted.'));
    process.exit(0);
  }

  const config: MyClaudeTeamConfig = {
    ...DEFAULT_CONFIG,
    projectName: String(projectName),
    ...(typeof projectDescription === 'string' && projectDescription.trim()
      ? { projectDescription: String(projectDescription).trim() }
      : {}),
  };

  // ---- Decide on overwrite ----
  let mode: 'create' | 'overwrite' | 'skip-if-exists' = opts.force ? 'overwrite' : 'skip-if-exists';
  if (!opts.force) {
    const ow = await confirm({
      message: 'Overwrite existing files in .claude/ if present? (No = skip existing, only create missing.)',
      initialValue: false,
    });
    if (isCancel(ow)) {
      outro(pc.dim('Aborted.'));
      process.exit(0);
    }
    if (ow) mode = 'overwrite';
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
  for (const r of report.results) {
    const sym =
      r.action === 'created' ? pc.green('+') :
      r.action === 'overwritten' ? pc.yellow('~') :
      r.action === 'skipped' ? pc.dim('·') :
      r.action === 'unchanged' ? pc.dim('=') :
      pc.cyan('m');
    log.raw(`  ${sym} ${pc.dim(`[${r.action}]`)} ${r.path.replace(opts.root + '/', '')}`);
  }
  if (opts.dryRun) {
    log.raw('');
    log.dim(`  ${report.plans.length} files would be written (dry-run, no changes made).`);
  }

  outro(
    opts.dryRun
      ? pc.dim('Dry run complete. Re-run without --dry-run to write files.')
      : pc.green('Done. ') + pc.dim(`Open CLAUDE.md and .claude/ to review.`)
  );
}
