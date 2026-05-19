import { join } from 'node:path';
import type { PackageManager } from '../types/profile.js';
import { readJsonMaybe } from '../lib/fs.js';

interface PkgJson {
  name?: string;
  scripts?: Record<string, string>;
}

/**
 * Identify canonical scripts (typecheck, test, lint, build, dev) and emit
 * the command string the user would actually run. We prefer the simplest
 * invocation that works at the repo root.
 */
export async function detectScripts(
  root: string,
  packageManager: PackageManager | null
): Promise<Record<string, string>> {
  const pkg = await readJsonMaybe<PkgJson>(join(root, 'package.json'));
  if (!pkg || !pkg.scripts) return {};

  const pm = packageManager ?? 'npm';
  const runner = pm === 'npm' ? 'npm run' : `${pm} run`;
  const directRunner = pm === 'npm' ? 'npm run' : pm;

  const candidates = [
    'dev',
    'build',
    'test',
    'test:unit',
    'test:e2e',
    'typecheck',
    'lint',
    'format',
    'check',
    'start',
  ];

  const out: Record<string, string> = {};
  for (const name of candidates) {
    if (pkg.scripts[name]) {
      // pnpm/yarn/bun let you call the script name directly (e.g. `pnpm test`).
      // npm requires `npm run test` (except for a handful of lifecycle names).
      const lifecycle = ['test', 'start'];
      const cmd = pm === 'npm' && !lifecycle.includes(name)
        ? `${runner} ${name}`
        : `${directRunner} ${name}`;
      out[name] = cmd;
    }
  }
  return out;
}

export function projectNameFrom(root: string, pkg: { name?: string } | null): string {
  if (pkg?.name) return pkg.name;
  const parts = root.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? 'unnamed-project';
}
