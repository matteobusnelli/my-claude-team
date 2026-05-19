/**
 * RepoProfile is the normalized output of the intelligence engine.
 * Generators consume it to emit project-specific .claude/* markdown.
 *
 * Every field is optional except `root` and `name` — detectors degrade
 * gracefully when signals are absent, and generators must handle missing
 * fields by omitting the relevant section rather than emitting placeholders.
 */

export type PackageManager = 'pnpm' | 'yarn' | 'npm' | 'bun';

export interface RepoProfile {
  /** Absolute path to the repo root. */
  root: string;
  /** Project name — from package.json or the directory name. */
  name: string;

  packageManager: PackageManager | null;
  /** Monorepo metadata, or `null` for single-package repos. */
  monorepo: MonorepoInfo | null;

  language: LanguageInfo;
  frontend: FrameworkInfo[];
  backend: FrameworkInfo[];
  database: DatabaseInfo | null;
  auth: ProviderInfo | null;
  storage: ProviderInfo | null;
  ui: ProviderInfo | null;
  validation: ProviderInfo | null;
  testing: TestingInfo;
  payments: ProviderInfo | null;
  ci: CIInfo | null;
  deployment: ProviderInfo | null;

  /** Compliance/safety signals inferred from code: encryption usage,
   *  audit-log tables, RLS, GDPR strings, HIPAA markers, etc. */
  compliance: ComplianceSignals;

  /** Canonical script names + how to invoke them.
   *  e.g. { typecheck: 'pnpm typecheck', test: 'pnpm test', ... } */
  scripts: Record<string, string>;

  /** Top-level directories that look meaningful (apps/, packages/, src/, ...). */
  layout: LayoutInfo;

  /** Coding conventions inferred from tsconfig, eslint, naming. */
  conventions: ConventionsInfo;
}

export interface MonorepoInfo {
  tool: 'turborepo' | 'nx' | 'pnpm-workspaces' | 'yarn-workspaces' | 'lerna' | 'unknown';
  workspaceGlobs: string[];
  /** Concrete workspace dirs that exist on disk. */
  workspaces: WorkspaceEntry[];
}

export interface WorkspaceEntry {
  /** Path relative to repo root. e.g. "apps/api". */
  path: string;
  /** Name from its package.json. */
  name: string;
  kind: 'app' | 'package' | 'unknown';
}

export interface LanguageInfo {
  typescript: boolean;
  strict: boolean;
  hasAny: 'allowed' | 'forbidden' | 'unknown';
}

export interface FrameworkInfo {
  name: string;
  /** Concrete version string from package.json, or null when undetectable. */
  version: string | null;
  /** Workspace path it lives in. */
  path: string;
  /** Extra hints: e.g. for next.js — "app-router", "pages-router", "rsc". */
  tags: string[];
}

export interface DatabaseInfo {
  orm: 'prisma' | 'drizzle' | 'typeorm' | 'kysely' | 'mongoose' | 'sequelize' | null;
  driver: 'postgres' | 'mysql' | 'sqlite' | 'mongodb' | 'unknown' | null;
  schemaPath: string | null;
  migrationsPath: string | null;
  /** Did we find row-level-security related code? */
  hasRLS: boolean;
  /** Approximate table count from schema scan. */
  tableCount: number | null;
}

export interface ProviderInfo {
  name: string;
  /** How we know — e.g. "package: @supabase/supabase-js" or "env: STRIPE_SECRET_KEY". */
  evidence: string[];
}

export interface TestingInfo {
  unit: ProviderInfo[];
  e2e: ProviderInfo[];
  tdd: boolean; // true if we see test-first signals (spec files alongside source)
}

export interface CIInfo {
  platform: 'github-actions' | 'gitlab-ci' | 'circleci' | 'unknown';
  workflowFiles: string[];
}

export interface ComplianceSignals {
  encryption: boolean;
  auditLogs: boolean;
  rls: boolean;
  gdpr: boolean;
  hipaa: boolean;
  /** Files where each signal was found, for citation in generated docs. */
  evidence: Record<string, string[]>;
}

export interface LayoutInfo {
  /** Top-level dirs that are not build artifacts. */
  topLevel: string[];
  hasDocsDir: boolean;
  hasInfraDir: boolean;
}

export interface ConventionsInfo {
  fileNaming: 'kebab-case' | 'camelCase' | 'PascalCase' | 'mixed' | 'unknown';
  hasEslint: boolean;
  hasPrettier: boolean;
  /** Path to a CONTRIBUTING.md if one exists. */
  contributingPath: string | null;
}
