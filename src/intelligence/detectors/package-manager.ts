import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageManager } from '../../types/profile.js';

/**
 * Pick a package manager by lockfile presence. Order matters when multiple
 * exist (rare but happens during migrations) — pnpm wins, then yarn, then bun,
 * then npm as default.
 */
export function detectPackageManager(root: string): PackageManager | null {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lockb'))) return 'bun';
  if (existsSync(join(root, 'package-lock.json'))) return 'npm';
  if (existsSync(join(root, 'package.json'))) return 'npm'; // best guess
  return null;
}
