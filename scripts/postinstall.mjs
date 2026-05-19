#!/usr/bin/env node
/**
 * Postinstall bootstrap.
 *
 * When a user runs `npm install --save-dev github:matteobusnelli/my-claude-team`
 * (or any other install path), this script writes exactly two files into the
 * consumer's project so they can immediately invoke `/create-my-claude-team-member`
 * in Claude Code:
 *
 *   - .claude/commands/create-my-claude-team-member.md  (the bootstrap slash command)
 *   - .claude/settings.local.json                        (permissions tuned to the stack)
 *
 * It is intentionally silent on failure — npm install must never fail because
 * of this script. It is also non-destructive — existing files are left alone.
 *
 * We detect "consumer project" vs "the package's own dev tree" via INIT_CWD.
 * `npm` always sets INIT_CWD to the directory the user ran `npm install` from.
 */

import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

async function main() {
  const initCwd = process.env.INIT_CWD;

  // Skip when the package is being installed in its own dev tree.
  if (!initCwd || initCwd === pkgRoot) return;

  // Only operate on JS projects (look for package.json at INIT_CWD).
  if (!existsSync(join(initCwd, 'package.json'))) return;

  // Lazy-load the compiled API from this package's dist/. If dist/ isn't
  // there yet (e.g. an exotic install path that skipped `prepare`), bail.
  let detectProfile, generateCommand, generateSettings, writeFileSafe, DEFAULT_CONFIG;
  try {
    ({ detectProfile } = await import(join(pkgRoot, 'dist/intelligence/index.js')));
    ({ generateCommand } = await import(join(pkgRoot, 'dist/generators/commands/index.js')));
    ({ generateSettings } = await import(join(pkgRoot, 'dist/generators/settings.js')));
    ({ writeFileSafe } = await import(join(pkgRoot, 'dist/lib/fs.js')));
    ({ DEFAULT_CONFIG } = await import(join(pkgRoot, 'dist/types/config.js')));
  } catch {
    return;
  }

  let createdAny = false;

  try {
    const profile = await detectProfile(initCwd);
    const ctx = { profile, config: DEFAULT_CONFIG, target: initCwd };

    const cmdPath = join(initCwd, '.claude/commands/create-my-claude-team-member.md');
    const settingsPath = join(initCwd, '.claude/settings.local.json');

    const r1 = await writeFileSafe(
      cmdPath,
      generateCommand('create-my-claude-team-member', ctx),
      'skip-if-exists'
    );
    const r2 = await writeFileSafe(
      settingsPath,
      generateSettings(ctx),
      'skip-if-exists'
    );

    if (r1.action === 'created' || r2.action === 'created') createdAny = true;
  } catch {
    return;
  }

  if (createdAny) {
    console.log('');
    console.log('\x1b[1m\x1b[35m▸ my-claude-team\x1b[0m bootstrapped this repo.');
    console.log('  Open Claude Code and run \x1b[36m/create-my-claude-team-member\x1b[0m');
    console.log('  to scan the codebase and generate the full setup.');
    console.log('');
  }
}

await main();
