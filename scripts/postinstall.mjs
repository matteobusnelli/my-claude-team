#!/usr/bin/env node
/**
 * Postinstall bootstrap.
 *
 * Static-template approach — no dependency on `dist/`, no scanning, no
 * imports. Just copies two bundled template files into the consumer's
 * `.claude/`. This means the bootstrap works even if `prepare` was
 * disabled, dist/ failed to build, or anything else exotic happened.
 *
 * Failure modes that this script CANNOT work around:
 *   - `npm config get ignore-scripts` is true → npm refuses to run any
 *     install scripts at all, including this one. Nothing the package
 *     can do; only the user can re-enable scripts.
 *
 * We always print a one-line outcome so users can tell whether postinstall
 * actually ran.
 */

import {
  existsSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const initCwd = process.env.INIT_CWD;

const log = (msg) => console.log(`\x1b[35m▸ my-claude-team\x1b[0m ${msg}`);

// Skip in the package's own dev tree.
if (!initCwd) {
  log('skipped (no INIT_CWD — this is normal for direct dev installs).');
  process.exit(0);
}
// Compare directories via path.relative so backslash-vs-forward-slash and
// trailing-separator differences (common on Windows) don't trip us up.
if (relative(resolve(initCwd), pkgRoot) === '') {
  process.exit(0); // silent — we're being installed in our own tree
}
if (!existsSync(join(initCwd, 'package.json'))) {
  log(`skipped (no package.json at INIT_CWD=${initCwd}).`);
  process.exit(0);
}

const templates = [
  {
    src: join(pkgRoot, 'templates/create-my-claude-team-member.md'),
    dst: join(initCwd, '.claude/commands/create-my-claude-team-member.md'),
    label: '/create-my-claude-team-member',
    overwrite: true, // framework-owned: always update
  },
  {
    src: join(pkgRoot, 'templates/settings.local.json'),
    dst: join(initCwd, '.claude/settings.local.json'),
    label: 'settings.local.json',
    overwrite: false, // user may have customized
  },
];

const actions = [];
for (const t of templates) {
  if (!existsSync(t.src)) {
    actions.push(`! missing template ${t.src.replace(pkgRoot + '/', '')}`);
    continue;
  }
  mkdirSync(dirname(t.dst), { recursive: true });
  if (existsSync(t.dst)) {
    if (!t.overwrite) {
      actions.push(`· skipped ${t.label} (already exists)`);
      continue;
    }
    // Skip if content matches (avoid noise on no-op installs).
    try {
      const current = readFileSync(t.dst, 'utf-8');
      const incoming = readFileSync(t.src, 'utf-8');
      if (current === incoming) {
        actions.push(`= unchanged ${t.label}`);
        continue;
      }
    } catch {
      // fall through to overwrite
    }
    copyFileSync(t.src, t.dst);
    actions.push(`~ updated ${t.label}`);
  } else {
    copyFileSync(t.src, t.dst);
    actions.push(`+ created ${t.label}`);
  }
}

log(`bootstrapped this repo at ${initCwd}:`);
for (const a of actions) console.log(`    ${a}`);
console.log(`    next: open Claude Code and run \x1b[36m/create-my-claude-team-member\x1b[0m`);
