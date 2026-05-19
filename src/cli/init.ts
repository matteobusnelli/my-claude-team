import { intro, outro, spinner } from '@clack/prompts';
import pc from 'picocolors';
import { join } from 'node:path';
import { detectProfile } from '../intelligence/index.js';
import { generateCommand } from '../generators/commands/index.js';
import { generateSettings } from '../generators/settings.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import { writeFileSafe, rel } from '../lib/fs.js';
import { log } from '../lib/log.js';
import type { CliOpts } from './scan.js';

/**
 * `init` bootstraps the conversation door, not the setup itself.
 * It writes exactly two files:
 *   1. `.claude/commands/create-my-claude-team-member.md` — the slash
 *      command Claude runs to actually do the scan + generation.
 *   2. `.claude/settings.local.json` — permissions calibrated to the
 *      detected stack, so the slash command can invoke its tools without
 *      prompting the user for each one.
 *
 * Everything else — CLAUDE.md, agents, skills, the rest of the commands —
 * is written by Claude when the user runs `/create-my-claude-team-member`
 * in a Claude Code session. Claude does the scanning *with judgment*:
 * sampling representative files, asking about domain vocabulary, and
 * calibrating P0 rules to the project's real constraints.
 *
 * `--full` runs the old behavior: generate everything deterministically
 * via the CLI, no LLM in the loop. Useful for CI or quick previews.
 */
export async function runInit(opts: CliOpts): Promise<void> {
  if (opts.full) {
    const { runInitFull } = await import('./init-full.js');
    await runInitFull(opts);
    return;
  }

  intro(pc.bgMagenta(pc.black(' my-claude-team ')) + ' ' + pc.dim('init'));

  const s = spinner();
  s.start('Scanning repository (so permissions match your stack)');
  const profile = await detectProfile(opts.root);
  s.stop(`Scanned ${pc.bold(profile.name)}`);

  const ctx = { profile, config: DEFAULT_CONFIG, target: opts.root };

  const writes = [
    {
      path: join(opts.root, '.claude', 'commands', 'create-my-claude-team-member.md'),
      content: generateCommand('create-my-claude-team-member', ctx),
    },
    {
      path: join(opts.root, '.claude', 'settings.local.json'),
      content: generateSettings(ctx),
    },
  ];

  log.raw('');
  for (const w of writes) {
    const result = await writeFileSafe(
      w.path,
      w.content,
      opts.force ? 'overwrite' : 'skip-if-exists'
    );
    const sym =
      result.action === 'created' ? pc.green('+') :
      result.action === 'overwritten' ? pc.yellow('~') :
      pc.dim('·');
    log.raw(`  ${sym} ${pc.dim(`[${result.action}]`)} ${rel(opts.root, result.path)}`);
  }

  log.raw('');
  log.raw(pc.bold('Next step:'));
  log.raw('');
  log.raw(`  Open Claude Code in this repo and run:`);
  log.raw('');
  log.raw(pc.cyan('    /create-my-claude-team-member'));
  log.raw('');
  log.raw(pc.dim('  Claude will scan the codebase, ask a couple of questions about your'));
  log.raw(pc.dim('  domain, then generate CLAUDE.md + every agent/skill/command tailored'));
  log.raw(pc.dim('  to what it found.'));
  log.raw('');
  log.dim('  (For a fully non-LLM generation — useful for CI — run `npx my-claude-team init --full`.)');

  outro(pc.green('Ready. ') + pc.dim('Continue inside Claude Code.'));
}
