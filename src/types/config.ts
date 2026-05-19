/**
 * MyClaudeTeamConfig is the user-editable contract that survives regeneration.
 * Stored at <repo>/my-claude-team.config.ts and re-read by every CLI command.
 *
 * Anything users want to customize between regenerations belongs here.
 * Things derived from the repo (stack, conventions) live in RepoProfile and
 * are recomputed every run.
 */

import type { RepoProfile } from './profile.js';

export interface MyClaudeTeamConfig {
  /** Display name used in CLAUDE.md headings. Defaults to RepoProfile.name. */
  projectName?: string;

  /** Single-sentence description of what this project is. */
  projectDescription?: string;

  /** Short domain vocabulary: the actors/personas your system has. */
  actors?: Actor[];

  /** Hard rules that override every agent's behavior. */
  hardRules?: HardRule[];

  /** Which agents to generate. Defaults to "auto" based on RepoProfile. */
  agents?: AgentSelection;

  /** Which skills to generate. */
  skills?: SkillSelection;

  /** Which slash commands to generate. */
  commands?: CommandSelection;

  /** Permission patterns merged into settings.local.json. */
  permissions?: string[];

  /** Hook configuration for settings.local.json. */
  hooks?: HookConfig;

  /** Overrides at generation time. Provided by `init` if the user opts in. */
  overrides?: ProfileOverrides;
}

export interface Actor {
  name: string;
  description: string;
  /** Role identifier in code, if any (e.g. "ADMIN"). */
  roleKey?: string;
}

export interface HardRule {
  id: string;
  title: string;
  body: string;
  /** Which agents should enforce this rule. "all" = every agent. */
  enforcedBy?: 'all' | string[];
}

export interface AgentSelection {
  mode: 'auto' | 'manual';
  include?: string[];
  exclude?: string[];
}

export interface SkillSelection {
  mode: 'auto' | 'manual';
  include?: string[];
  exclude?: string[];
}

export interface CommandSelection {
  mode: 'auto' | 'manual';
  include?: string[];
  exclude?: string[];
}

export interface HookConfig {
  PostToolUse?: HookEntry[];
  PreToolUse?: HookEntry[];
  Stop?: HookEntry[];
}

export interface HookEntry {
  matcher: string;
  hooks: { command: string }[];
}

export interface ProfileOverrides {
  /** Override detected stack labels for the generated CLAUDE.md. */
  stack?: string[];
}

export const DEFAULT_CONFIG: MyClaudeTeamConfig = {
  agents: { mode: 'auto' },
  skills: { mode: 'auto' },
  commands: { mode: 'auto' },
};

/** Shape of the data passed to every generator. */
export interface GenerationContext {
  profile: RepoProfile;
  config: MyClaudeTeamConfig;
  /** Where to write files (almost always the repo root). */
  target: string;
}
