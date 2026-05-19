import { intro, outro, spinner } from '@clack/prompts';
import pc from 'picocolors';
import { detectProfile } from '../intelligence/index.js';
import { generateAll } from '../generators/index.js';
import { DEFAULT_CONFIG, type MyClaudeTeamConfig } from '../types/config.js';
import { log } from '../lib/log.js';
import { rel } from '../lib/fs.js';
import { printProfile, type CliOpts } from './scan.js';

/**
 * `init --full` — generate the entire .claude/ tree deterministically,
 * no Claude in the loop. Useful for CI, automation, or users who want a
 * fast baseline without opening a chat.
 *
 * This is the original `init` behavior, preserved as an escape hatch.
 */
export async function runInitFull(opts: CliOpts): Promise<void> {
  intro(pc.bgMagenta(pc.black(' my-claude-team ')) + ' ' + pc.dim('init --full'));

  const s = spinner();
  s.start('Scanning repository');
  const profile = await detectProfile(opts.root);
  s.stop(`Scanned ${pc.bold(profile.name)}`);

  log.raw('');
  printProfile(profile);
  log.raw('');

  const config: MyClaudeTeamConfig = {
    ...DEFAULT_CONFIG,
    projectName: profile.name,
  };

  const mode = opts.force ? 'overwrite' : 'skip-if-exists';

  const s2 = spinner();
  s2.start('Generating .claude/ setup');
  const report = await generateAll(
    { profile, config, target: opts.root },
    { target: 'all', mode, dryRun: opts.dryRun }
  );
  s2.stop(opts.dryRun ? 'Plan ready (dry-run)' : 'Generated');

  log.raw('');
  let created = 0, overwritten = 0, skipped = 0;
  for (const r of report.results) {
    const sym =
      r.action === 'created' ? pc.green('+') :
      r.action === 'overwritten' ? pc.yellow('~') :
      r.action === 'skipped' ? pc.dim('·') :
      pc.dim('=');
    if (r.action === 'created') created++;
    else if (r.action === 'overwritten') overwritten++;
    else if (r.action === 'skipped') skipped++;
    log.raw(`  ${sym} ${pc.dim(`[${r.action}]`)} ${rel(opts.root, r.path)}`);
  }

  log.raw('');
  if (opts.dryRun) {
    log.dim(`  ${report.plans.length} files would be written (dry-run).`);
  } else {
    log.dim(`  ${created} created, ${overwritten} overwritten, ${skipped} skipped.`);
  }

  outro(opts.dryRun ? pc.dim('Dry run complete.') : pc.green('Done.'));
}
