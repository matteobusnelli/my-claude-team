import { join } from 'node:path';
import { existsSync, promises as fs } from 'node:fs';
import type { DatabaseInfo, MonorepoInfo } from '../../types/profile.js';
import { readJsonMaybe, readMaybe, walkSource, grepFiles, rel } from '../../lib/fs.js';

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * ORM detection by dependency, plus a schema scan to count tables and detect RLS.
 * Drivers are inferred from typical companion packages.
 */
export async function detectDatabase(
  root: string,
  monorepo: MonorepoInfo | null
): Promise<DatabaseInfo | null> {
  const allDeps = await collectAllDeps(root, monorepo);

  let orm: DatabaseInfo['orm'] = null;
  if (allDeps.has('@prisma/client') || allDeps.has('prisma')) orm = 'prisma';
  else if (allDeps.has('drizzle-orm')) orm = 'drizzle';
  else if (allDeps.has('typeorm')) orm = 'typeorm';
  else if (allDeps.has('kysely')) orm = 'kysely';
  else if (allDeps.has('mongoose')) orm = 'mongoose';
  else if (allDeps.has('sequelize')) orm = 'sequelize';

  let driver: DatabaseInfo['driver'] = null;
  if (allDeps.has('pg') || allDeps.has('postgres') || allDeps.has('@supabase/supabase-js')) driver = 'postgres';
  else if (allDeps.has('mysql2') || allDeps.has('mysql')) driver = 'mysql';
  else if (allDeps.has('better-sqlite3') || allDeps.has('sqlite3')) driver = 'sqlite';
  else if (allDeps.has('mongodb') || orm === 'mongoose') driver = 'mongodb';

  if (!orm && !driver) return null;

  const schemaPath = await findSchemaPath(root, orm);
  const migrationsPath = await findMigrationsPath(root);
  const tableCount = schemaPath ? await countModels(join(root, schemaPath), orm) : null;
  const hasRLS = await detectRLS(root);

  return { orm, driver, schemaPath, migrationsPath, hasRLS, tableCount };
}

async function collectAllDeps(
  root: string,
  monorepo: MonorepoInfo | null
): Promise<Set<string>> {
  const set = new Set<string>();
  const paths = ['.', ...(monorepo?.workspaces.map((w) => w.path) ?? [])];
  for (const p of paths) {
    const pkg = await readJsonMaybe<PkgJson>(join(root, p, 'package.json'));
    if (!pkg) continue;
    for (const k of Object.keys(pkg.dependencies ?? {})) set.add(k);
    for (const k of Object.keys(pkg.devDependencies ?? {})) set.add(k);
  }
  return set;
}

async function findSchemaPath(
  root: string,
  orm: DatabaseInfo['orm']
): Promise<string | null> {
  if (orm === 'prisma') {
    const candidates = [
      'prisma/schema.prisma',
      'packages/database/prisma/schema.prisma',
      'apps/api/prisma/schema.prisma',
    ];
    for (const c of candidates) {
      if (existsSync(join(root, c))) return c;
    }
    // Walk and find any schema.prisma
    const files = await walkSource(root, {
      extensions: ['.prisma'],
      maxFiles: 100,
    });
    if (files[0]) return rel(root, files[0]);
  }
  if (orm === 'drizzle') {
    const candidates = [
      'src/db/schema.ts', 'drizzle/schema.ts', 'src/schema.ts',
    ];
    for (const c of candidates) {
      if (existsSync(join(root, c))) return c;
    }
  }
  return null;
}

async function findMigrationsPath(root: string): Promise<string | null> {
  const candidates = [
    'supabase/migrations',
    'prisma/migrations',
    'packages/database/prisma/migrations',
    'drizzle/migrations',
    'migrations',
  ];
  for (const c of candidates) {
    if (existsSync(join(root, c))) return c;
  }
  return null;
}

async function countModels(
  schemaAbsPath: string,
  orm: DatabaseInfo['orm']
): Promise<number | null> {
  try {
    const content = await fs.readFile(schemaAbsPath, 'utf-8');
    if (!content) return null;
    if (orm === 'prisma') {
      const matches = content.match(/^model\s+\w+\s*\{/gm);
      return matches?.length ?? 0;
    }
    if (orm === 'drizzle') {
      const matches = content.match(/=\s*pgTable\(|=\s*mysqlTable\(|=\s*sqliteTable\(/g);
      return matches?.length ?? 0;
    }
  } catch {
    // ignore
  }
  return null;
}

async function detectRLS(root: string): Promise<boolean> {
  // Look in common migrations + schema dirs for RLS markers.
  const probeDirs = [
    'supabase/migrations',
    'prisma/migrations',
    'packages/database/prisma',
  ];
  for (const dir of probeDirs) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    const files = await walkSource(abs, {
      extensions: ['.sql', '.ts'],
      maxFiles: 200,
    });
    const matches = await grepFiles(files, [
      'ROW LEVEL SECURITY',
      'ENABLE RLS',
      'CREATE POLICY',
      'rls/index.ts',
    ], { maxMatches: 1 });
    if (matches.length > 0) return true;
  }
  return false;
}
