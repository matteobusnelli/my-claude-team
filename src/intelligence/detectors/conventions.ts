import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { ConventionsInfo, LanguageInfo, LayoutInfo } from '../../types/profile.js';
import { readJsonMaybe, walkSource } from '../../lib/fs.js';

interface TsConfig {
  compilerOptions?: {
    strict?: boolean;
    noImplicitAny?: boolean;
    exactOptionalPropertyTypes?: boolean;
  };
}

export async function detectLanguage(root: string): Promise<LanguageInfo> {
  const tsconfig = await readJsonMaybe<TsConfig>(join(root, 'tsconfig.json'));
  if (!tsconfig) {
    return { typescript: false, strict: false, hasAny: 'unknown' };
  }
  const strict = tsconfig.compilerOptions?.strict === true;
  const noImplicitAny = tsconfig.compilerOptions?.noImplicitAny === true;
  return {
    typescript: true,
    strict,
    hasAny: strict || noImplicitAny ? 'forbidden' : 'allowed',
  };
}

export async function detectConventions(root: string): Promise<ConventionsInfo> {
  const hasEslint =
    existsSync(join(root, 'eslint.config.mjs')) ||
    existsSync(join(root, 'eslint.config.js')) ||
    existsSync(join(root, '.eslintrc')) ||
    existsSync(join(root, '.eslintrc.json')) ||
    existsSync(join(root, '.eslintrc.cjs'));
  const hasPrettier =
    existsSync(join(root, '.prettierrc')) ||
    existsSync(join(root, '.prettierrc.json')) ||
    existsSync(join(root, 'prettier.config.js')) ||
    existsSync(join(root, '.prettierrc.cjs'));
  const contributingPath = existsSync(join(root, 'CONTRIBUTING.md'))
    ? 'CONTRIBUTING.md'
    : null;

  // Sample 50 source files and infer naming convention.
  const fileNaming = await inferFileNaming(root);

  return { fileNaming, hasEslint, hasPrettier, contributingPath };
}

async function inferFileNaming(
  root: string
): Promise<ConventionsInfo['fileNaming']> {
  const files = await walkSource(root, {
    extensions: ['.ts', '.tsx'],
    maxFiles: 80,
  });
  let kebab = 0,
    camel = 0,
    pascal = 0,
    other = 0;
  for (const f of files) {
    const base = f.split(/[\\/]/).pop()!.replace(/\.(spec|test)\.tsx?$/, '').replace(/\.tsx?$/, '');
    if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.[a-z]+)*$/.test(base)) kebab++;
    else if (/^[A-Z][a-zA-Z0-9]*$/.test(base)) pascal++;
    else if (/^[a-z][a-zA-Z0-9]*$/.test(base)) camel++;
    else other++;
  }
  if (kebab > pascal && kebab > camel) return 'kebab-case';
  if (pascal > kebab && pascal > camel) return 'PascalCase';
  if (camel > kebab && camel > pascal) return 'camelCase';
  if (kebab + pascal + camel === 0) return 'unknown';
  return 'mixed';
}

export async function detectLayout(root: string): Promise<LayoutInfo> {
  const skip = new Set([
    'node_modules', '.git', 'dist', 'build', '.next', '.turbo',
    '.nuxt', '.output', 'coverage', '.cache', '.vercel',
  ]);
  const topLevel: string[] = [];
  try {
    const { promises: fs } = await import('node:fs');
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const e of entries) {
      if (skip.has(e.name)) continue;
      if (e.name.startsWith('.') && e.name !== '.github') continue;
      if (e.isDirectory()) topLevel.push(e.name);
    }
  } catch {
    // ignore
  }
  return {
    topLevel,
    hasDocsDir: topLevel.includes('docs'),
    hasInfraDir: ['infra', 'infrastructure', 'terraform', 'deploy'].some((d) => topLevel.includes(d)),
  };
}
