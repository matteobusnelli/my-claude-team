/**
 * Safe filesystem helpers. The framework must never silently destroy user work,
 * so writes here are explicit about overwrite policy.
 */

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';

export type WriteMode = 'create' | 'overwrite' | 'skip-if-exists' | 'merge';

export interface WriteResult {
  path: string;
  action: 'created' | 'overwritten' | 'skipped' | 'merged' | 'unchanged';
  bytes: number;
}

/** Read a file, returning null if it doesn't exist. */
export async function readMaybe(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

/** Read JSON, returning null on missing/invalid. Logs the cause for debugging. */
export async function readJsonMaybe<T = unknown>(path: string): Promise<T | null> {
  const raw = await readMaybe(path);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

/**
 * Write a file with explicit overwrite policy. Returns what happened so the
 * CLI can summarize the run.
 */
export async function writeFileSafe(
  path: string,
  content: string,
  mode: WriteMode = 'skip-if-exists'
): Promise<WriteResult> {
  await ensureDir(dirname(path));
  const exists = existsSync(path);

  if (exists && mode === 'skip-if-exists') {
    return { path, action: 'skipped', bytes: 0 };
  }

  if (exists) {
    const current = await fs.readFile(path, 'utf-8');
    if (current === content) {
      return { path, action: 'unchanged', bytes: content.length };
    }
  }

  await fs.writeFile(path, content, 'utf-8');
  return {
    path,
    action: exists ? 'overwritten' : 'created',
    bytes: content.length,
  };
}

/**
 * List files under a directory matching an extension whitelist, skipping
 * common build/vendor dirs. Used by detectors that need to scan source.
 */
export async function walkSource(
  root: string,
  opts: {
    extensions?: string[];
    maxFiles?: number;
    ignore?: string[];
  } = {}
): Promise<string[]> {
  const exts = new Set(opts.extensions ?? ['.ts', '.tsx', '.js', '.jsx']);
  const ignore = new Set([
    'node_modules', '.git', 'dist', 'build', '.next', '.turbo',
    '.nuxt', '.output', 'coverage', '.cache', '.vercel',
    ...(opts.ignore ?? []),
  ]);
  const maxFiles = opts.maxFiles ?? 5000;
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (out.length >= maxFiles) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= maxFiles) return;
      if (ignore.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.github') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const dot = entry.name.lastIndexOf('.');
        const ext = dot >= 0 ? entry.name.slice(dot) : '';
        if (exts.has(ext)) out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

/** Search a list of files for any of the given substrings. Returns matching files. */
export async function grepFiles(
  files: string[],
  needles: string[],
  opts: { maxMatches?: number } = {}
): Promise<{ file: string; matchedNeedle: string }[]> {
  const out: { file: string; matchedNeedle: string }[] = [];
  const max = opts.maxMatches ?? 20;
  for (const file of files) {
    if (out.length >= max) break;
    try {
      const content = await fs.readFile(file, 'utf-8');
      for (const needle of needles) {
        if (content.includes(needle)) {
          out.push({ file, matchedNeedle: needle });
          break;
        }
      }
    } catch {
      // skip unreadable
    }
  }
  return out;
}

/** Relative path from repo root, with forward slashes. */
export function rel(root: string, path: string): string {
  return relative(root, path).split(/[\\/]/).join('/');
}

export { resolve };
