import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { FrameworkInfo, MonorepoInfo } from '../../types/profile.js';
import { readJsonMaybe, readMaybe } from '../../lib/fs.js';

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface Detection {
  pkgKey: string;
  name: string;
  category: 'frontend' | 'backend';
  /** Optional callback to add tags by inspecting workspace files. */
  inspect?: (workspacePath: string) => Promise<string[]>;
}

const KNOWN: Detection[] = [
  {
    pkgKey: 'next',
    name: 'Next.js',
    category: 'frontend',
    inspect: async (wsPath) => {
      const tags: string[] = [];
      if (existsSync(join(wsPath, 'app')) || existsSync(join(wsPath, 'src/app'))) {
        tags.push('app-router', 'rsc');
      } else if (existsSync(join(wsPath, 'pages')) || existsSync(join(wsPath, 'src/pages'))) {
        tags.push('pages-router');
      }
      return tags;
    },
  },
  { pkgKey: 'remix', name: 'Remix', category: 'frontend' },
  { pkgKey: '@remix-run/react', name: 'Remix', category: 'frontend' },
  { pkgKey: 'nuxt', name: 'Nuxt', category: 'frontend' },
  { pkgKey: '@sveltejs/kit', name: 'SvelteKit', category: 'frontend' },
  { pkgKey: 'astro', name: 'Astro', category: 'frontend' },
  { pkgKey: 'vite', name: 'Vite', category: 'frontend' },
  { pkgKey: 'react', name: 'React', category: 'frontend' },
  { pkgKey: 'vue', name: 'Vue', category: 'frontend' },
  { pkgKey: 'expo', name: 'Expo', category: 'frontend' },
  { pkgKey: 'react-native', name: 'React Native', category: 'frontend' },

  { pkgKey: '@nestjs/core', name: 'NestJS', category: 'backend' },
  { pkgKey: 'express', name: 'Express', category: 'backend' },
  { pkgKey: 'fastify', name: 'Fastify', category: 'backend' },
  { pkgKey: 'hono', name: 'Hono', category: 'backend' },
  { pkgKey: '@hono/node-server', name: 'Hono', category: 'backend' },
  { pkgKey: 'koa', name: 'Koa', category: 'backend' },
  { pkgKey: 'h3', name: 'h3', category: 'backend' },
  { pkgKey: 'trpc', name: 'tRPC', category: 'backend' },
  { pkgKey: '@trpc/server', name: 'tRPC', category: 'backend' },
];

export async function detectFrameworks(
  root: string,
  monorepo: MonorepoInfo | null
): Promise<{ frontend: FrameworkInfo[]; backend: FrameworkInfo[] }> {
  const frontend: FrameworkInfo[] = [];
  const backend: FrameworkInfo[] = [];
  const seen = new Set<string>();

  const candidates: { path: string }[] = monorepo
    ? monorepo.workspaces.map((w) => ({ path: w.path }))
    : [{ path: '.' }];

  // For monorepos, also check root package.json — but only AFTER workspaces,
  // so a workspace-level detection beats a root-level one. The dedup key
  // below uses framework name only (not path) for single-detection-per-repo,
  // which prevents the same framework showing up twice when listed in both
  // root and workspace.
  if (monorepo) candidates.push({ path: '.' });

  for (const cand of candidates) {
    const wsAbs = join(root, cand.path);
    const pkg = await readJsonMaybe<PkgJson>(join(wsAbs, 'package.json'));
    if (!pkg) continue;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const k of KNOWN) {
      if (!deps[k.pkgKey]) continue;
      // Dedupe by framework name globally — a framework appears once per repo,
      // attributed to the first workspace where it was found.
      if (seen.has(k.name)) continue;
      seen.add(k.name);

      const version = stripRange(deps[k.pkgKey] ?? null);
      const tags = k.inspect ? await k.inspect(wsAbs) : [];
      const info: FrameworkInfo = {
        name: k.name,
        version,
        path: cand.path,
        tags,
      };
      (k.category === 'frontend' ? frontend : backend).push(info);
    }
  }
  return { frontend, backend };
}

function stripRange(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.replace(/^[\^~>=<]+/, '').trim();
}
