/**
 * Public API. Importable by user config files via:
 *   import type { MyClaudeTeamConfig } from 'my-claude-team';
 */

export type {
  MyClaudeTeamConfig,
  Actor,
  HardRule,
  AgentSelection,
  SkillSelection,
  CommandSelection,
  HookConfig,
  HookEntry,
  ProfileOverrides,
  GenerationContext,
} from './types/config.js';

export type {
  RepoProfile,
  PackageManager,
  MonorepoInfo,
  WorkspaceEntry,
  LanguageInfo,
  FrameworkInfo,
  DatabaseInfo,
  ProviderInfo,
  TestingInfo,
  CIInfo,
  ComplianceSignals,
  LayoutInfo,
  ConventionsInfo,
} from './types/profile.js';

export { detectProfile } from './intelligence/index.js';
export { generateAll } from './generators/index.js';
