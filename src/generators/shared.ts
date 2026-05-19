/**
 * Shared helpers used by every generator. These ensure the output stays
 * stylistically consistent across the .claude/ tree — important for the
 * "handcrafted, project-specific" feel the framework promises.
 */

import type { GenerationContext } from '../types/config.js';
import type { RepoProfile } from '../types/profile.js';

/** Project-specific noun: prefer config.projectName, fall back to profile.name. */
export function projectLabel(ctx: GenerationContext): string {
  return ctx.config.projectName ?? ctx.profile.name;
}

/** Returns the most likely "where the backend code lives" path, or null. */
export function backendPath(profile: RepoProfile): string | null {
  if (profile.backend.length === 0) return null;
  const b = profile.backend[0]!;
  return b.path === '.' ? null : b.path;
}

export function frontendPath(profile: RepoProfile): string | null {
  if (profile.frontend.length === 0) return null;
  const f = profile.frontend[0]!;
  return f.path === '.' ? null : f.path;
}

/** Render a comma-joined "X, Y, and Z" list. */
export function naturalJoin(parts: string[]): string {
  const xs = parts.filter(Boolean);
  if (xs.length === 0) return '';
  if (xs.length === 1) return xs[0]!;
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`;
}

/** Stack-summary sentence used in CLAUDE.md and agent prompts. */
export function stackSentence(profile: RepoProfile): string {
  const parts: string[] = [];
  if (profile.language.typescript) parts.push(`TypeScript${profile.language.strict ? ' strict' : ''}`);
  if (profile.packageManager) parts.push(profile.packageManager);
  if (profile.monorepo) parts.push(profile.monorepo.tool);
  for (const f of profile.frontend) parts.push(f.name);
  for (const b of profile.backend) parts.push(b.name);
  if (profile.database) parts.push(profile.database.orm ?? profile.database.driver ?? 'database');
  if (profile.ui) parts.push(profile.ui.name);
  if (profile.testing.unit[0]) parts.push(profile.testing.unit[0].name);
  if (profile.testing.e2e[0]) parts.push(profile.testing.e2e[0].name);
  if (profile.deployment) parts.push(profile.deployment.name);
  return parts.join(', ');
}

/** Returns true if the profile has a backend codebase worth a dedicated agent. */
export function hasBackend(profile: RepoProfile): boolean {
  return profile.backend.length > 0;
}
export function hasFrontend(profile: RepoProfile): boolean {
  return profile.frontend.length > 0;
}
export function hasDatabase(profile: RepoProfile): boolean {
  return profile.database !== null;
}
export function hasUI(profile: RepoProfile): boolean {
  return profile.ui !== null;
}
export function hasCI(profile: RepoProfile): boolean {
  return profile.ci !== null;
}

/**
 * Choose which agents to generate based on detected stack.
 * Returns the canonical id list — used as filenames.
 */
export function selectAgents(profile: RepoProfile): string[] {
  const out: string[] = ['architect', 'code-reviewer'];
  if (hasBackend(profile)) out.push('backend');
  if (hasFrontend(profile)) out.push('frontend');
  if (hasDatabase(profile)) out.push('database');
  if (hasUI(profile)) out.push('ui');
  if (profile.compliance.encryption || profile.compliance.gdpr || profile.compliance.hipaa || profile.compliance.rls) {
    out.push('security');
  }
  out.push('testing');
  if (hasCI(profile) || profile.deployment) out.push('devops');
  return out;
}

/** Same selection logic for skills — only emit pattern-encoders for what exists. */
export function selectSkills(profile: RepoProfile): string[] {
  const out: string[] = [
    'rules',
    'feature-workflow',
    'start-feature',
    'implement-feature',
    'bugfix',
    'incident-review',
    'testing',
  ];
  if (hasBackend(profile)) out.push('create-api-feature');
  if (hasFrontend(profile)) out.push('create-web-page');
  if (hasDatabase(profile)) out.push('data-model');
  if (profile.compliance.encryption || profile.compliance.gdpr || profile.compliance.hipaa || profile.auth) {
    out.push('security-privacy');
  }
  return out;
}

export function selectCommands(profile: RepoProfile): string[] {
  const out: string[] = [
    'create-my-claude-team-member',
    'analyze-repo',
    'feature-workflow',
    'bugfix',
    'code-review',
    'incident-review',
    'rebuild-ai-setup',
  ];
  if (profile.scripts.typecheck) out.push('typecheck');
  return out;
}

/** Format the canonical typecheck command for use in skill/agent prompts. */
export function typecheckCmd(profile: RepoProfile): string {
  return profile.scripts.typecheck ?? `${profile.packageManager ?? 'npm'} run typecheck`;
}
export function testCmd(profile: RepoProfile): string {
  return profile.scripts.test ?? `${profile.packageManager ?? 'npm'} test`;
}
export function buildCmd(profile: RepoProfile): string {
  return profile.scripts.build ?? `${profile.packageManager ?? 'npm'} run build`;
}
export function devCmd(profile: RepoProfile): string {
  return profile.scripts.dev ?? `${profile.packageManager ?? 'npm'} run dev`;
}
export function lintCmd(profile: RepoProfile): string {
  return profile.scripts.lint ?? `${profile.packageManager ?? 'npm'} run lint`;
}
