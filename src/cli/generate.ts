import pc from 'picocolors';
import { detectProfile } from '../intelligence/index.js';
import { generateAll, type GenerateOptions } from '../generators/index.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import { log } from '../lib/log.js';
import { rel } from '../lib/fs.js';
import type { CliOpts } from './scan.js';

const VALID_TARGETS = ['all', 'claude-md', 'index-md', 'agents', 'skills', 'commands', 'settings', 'config'] as const;
type Target = (typeof VALID_TARGETS)[number];

/**
 * Regenerate a slice of the setup without going through the interactive flow.
 * Useful in CI or post-merge hooks.
 */
export async function runGenerate(opts: CliOpts): Promise<void> {
  const targetArg = opts.positional[0] ?? 'all';
  if (!(VALID_TARGETS as readonly string[]).includes(targetArg)) {
    log.err(`Invalid target: ${targetArg}. Valid: ${VALID_TARGETS.join(', ')}`);
    process.exit(1);
  }
  const target = targetArg as Target;

  const profile = await detectProfile(opts.root);

  const genOpts: GenerateOptions = {
    target,
    mode: opts.force ? 'overwrite' : 'skip-if-exists',
    dryRun: opts.dryRun,
  };

  const report = await generateAll(
    { profile, config: DEFAULT_CONFIG, target: opts.root },
    genOpts
  );

  if (opts.dryRun) {
    log.step(`Plan (dry-run): ${report.plans.length} files`);
    for (const p of report.plans) {
      log.raw(`  ${pc.cyan('+')} ${rel(opts.root, p.path)} ${pc.dim(`(${p.group}, ${p.content.length}B)`)}`);
    }
    return;
  }

  for (const r of report.results) {
    const sym =
      r.action === 'created' ? pc.green('+') :
      r.action === 'overwritten' ? pc.yellow('~') :
      r.action === 'skipped' ? pc.dim('·') :
      pc.dim('=');
    log.raw(`  ${sym} ${pc.dim(`[${r.action}]`)} ${rel(opts.root, r.path)}`);
  }
  log.ok(`Generated ${target}.`);
}
