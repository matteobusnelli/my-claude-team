import { join } from 'node:path';
import type { MonorepoInfo, ProviderInfo, TestingInfo } from '../../types/profile.js';
import { readJsonMaybe, walkSource } from '../../lib/fs.js';

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function detectTesting(
  root: string,
  monorepo: MonorepoInfo | null
): Promise<TestingInfo> {
  const deps = new Set<string>();
  const paths = ['.', ...(monorepo?.workspaces.map((w) => w.path) ?? [])];
  for (const p of paths) {
    const pkg = await readJsonMaybe<PkgJson>(join(root, p, 'package.json'));
    if (!pkg) continue;
    for (const k of Object.keys(pkg.dependencies ?? {})) deps.add(k);
    for (const k of Object.keys(pkg.devDependencies ?? {})) deps.add(k);
  }

  const unit: ProviderInfo[] = [];
  const e2e: ProviderInfo[] = [];

  if (deps.has('vitest')) unit.push({ name: 'Vitest', evidence: ['package: vitest'] });
  if (deps.has('jest') || deps.has('ts-jest') || deps.has('@nestjs/testing')) {
    unit.push({ name: 'Jest', evidence: ['package: jest'] });
  }
  if (deps.has('@testing-library/react')) {
    unit.push({ name: 'React Testing Library', evidence: ['package: @testing-library/react'] });
  }
  if (deps.has('supertest')) {
    unit.push({ name: 'Supertest', evidence: ['package: supertest'] });
  }
  if (deps.has('@playwright/test') || deps.has('playwright')) {
    e2e.push({ name: 'Playwright', evidence: ['package: @playwright/test'] });
  }
  if (deps.has('cypress')) {
    e2e.push({ name: 'Cypress', evidence: ['package: cypress'] });
  }

  // TDD signal: look for colocated *.spec.ts / *.test.ts next to source.
  const tdd = await hasColocatedSpecs(root);

  return { unit, e2e, tdd };
}

async function hasColocatedSpecs(root: string): Promise<boolean> {
  const files = await walkSource(root, {
    extensions: ['.ts', '.tsx'],
    maxFiles: 1000,
  });
  let specs = 0;
  for (const f of files) {
    if (/\.(spec|test)\.tsx?$/.test(f)) {
      specs++;
      if (specs >= 3) return true;
    }
  }
  return specs > 0;
}
