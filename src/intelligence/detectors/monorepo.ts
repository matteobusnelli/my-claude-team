import { existsSync, promises as fs } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import type { MonorepoInfo, WorkspaceEntry } from '../../types/profile.js';
import { readJsonMaybe, readMaybe, ensureDir } from '../../lib/fs.js';

interface PackageJson {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
}

/**
 * Detect monorepo shape: turborepo, nx, pnpm workspaces, yarn workspaces, lerna.
 * Returns null for single-package repos.
 */
export async function detectMonorepo(root: string): Promise<MonorepoInfo | null> {
  const pkg = await readJsonMaybe<PackageJson>(join(root, 'package.json'));
  if (!pkg) return null;

  let tool: MonorepoInfo['tool'] | null = null;
  let workspaceGlobs: string[] = [];

  // Turborepo
  if (existsSync(join(root, 'turbo.json'))) {
    tool = 'turborepo';
  }
  // Nx
  if (existsSync(join(root, 'nx.json'))) {
    tool = 'nx';
  }
  // pnpm-workspace.yaml
  const pnpmWs = await readMaybe(join(root, 'pnpm-workspace.yaml'));
  if (pnpmWs) {
    tool ??= 'pnpm-workspaces';
    workspaceGlobs.push(...parsePnpmWorkspace(pnpmWs));
  }
  // package.json workspaces field
  if (pkg.workspaces) {
    if (Array.isArray(pkg.workspaces)) {
      workspaceGlobs.push(...pkg.workspaces);
      tool ??= 'yarn-workspaces';
    } else if (pkg.workspaces.packages) {
      workspaceGlobs.push(...pkg.workspaces.packages);
      tool ??= 'yarn-workspaces';
    }
  }
  // Lerna
  if (existsSync(join(root, 'lerna.json'))) {
    tool ??= 'lerna';
  }

  if (!tool && workspaceGlobs.length === 0) {
    return null;
  }

  const workspaces = await resolveWorkspaces(root, workspaceGlobs);

  return {
    tool: tool ?? 'unknown',
    workspaceGlobs,
    workspaces,
  };
}

function parsePnpmWorkspace(content: string): string[] {
  const out: string[] = [];
  let inPackages = false;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#') || !line) continue;
    if (line.startsWith('packages:')) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const m = line.match(/^-\s*['"]?([^'"]+)['"]?$/);
      if (m && m[1]) out.push(m[1]);
      else if (!line.startsWith('-')) inPackages = false;
    }
  }
  return out;
}

/**
 * Expand simple `apps/*` / `packages/*` style globs into concrete dirs.
 * We support the common one-level-star pattern — that covers ~95% of OSS repos.
 */
async function resolveWorkspaces(
  root: string,
  globs: string[]
): Promise<WorkspaceEntry[]> {
  const entries: WorkspaceEntry[] = [];
  const seen = new Set<string>();

  for (const glob of globs) {
    const m = glob.match(/^([^*]+)\/\*\/?$/);
    if (m && m[1]) {
      const parent = join(root, m[1]);
      try {
        const dirs = await fs.readdir(parent, { withFileTypes: true });
        for (const d of dirs) {
          if (!d.isDirectory()) continue;
          const rel = `${m[1]}/${d.name}`;
          if (seen.has(rel)) continue;
          seen.add(rel);
          const ws = await readWorkspace(root, rel);
          if (ws) entries.push(ws);
        }
      } catch {
        // parent dir doesn't exist; ignore
      }
    } else if (!glob.includes('*')) {
      if (seen.has(glob)) continue;
      seen.add(glob);
      const ws = await readWorkspace(root, glob);
      if (ws) entries.push(ws);
    }
  }
  return entries;
}

async function readWorkspace(
  root: string,
  relPath: string
): Promise<WorkspaceEntry | null> {
  const pkgPath = join(root, relPath, 'package.json');
  if (!existsSync(pkgPath)) return null;
  const pkg = await readJsonMaybe<PackageJson>(pkgPath);
  const parent = relPath.split('/')[0] ?? '';
  const kind: WorkspaceEntry['kind'] =
    parent === 'apps' ? 'app' :
    parent === 'packages' ? 'package' :
    'unknown';
  return {
    path: relPath,
    name: pkg?.name ?? basename(relPath),
    kind,
  };
}
