import type { GenerationContext } from '../types/config.js';

/**
 * Emit a starter my-claude-team.config.ts. Users edit this between regenerations
 * to inject custom rules, actors, or agent overrides.
 */
export function generateConfigTs(ctx: GenerationContext): string {
  const { profile } = ctx;
  const name = ctx.config.projectName ?? profile.name;

  return `import type { MyClaudeTeamConfig } from 'my-claude-team';

/**
 * Configuration that survives \`my-claude-team generate\`. Anything you want
 * customized between regenerations belongs here. Detected stack signals
 * (frameworks, conventions) are recomputed every run.
 */
const config: MyClaudeTeamConfig = {
  projectName: ${JSON.stringify(name)},

  // One-sentence description used in CLAUDE.md §1.
  // projectDescription: 'Customer-facing portal for ...',

  // Domain vocabulary — the actors/personas your system has.
  // actors: [
  //   { name: 'Admin', description: 'Operations staff', roleKey: 'ADMIN' },
  // ],

  // Hard rules merged into CLAUDE.md §5 — override every agent's behavior.
  // hardRules: [
  //   { id: 'no-secrets', title: 'No secrets in code', body: 'Use env vars.' },
  // ],

  // Extra permission patterns merged into .claude/settings.local.json.
  // permissions: ['Bash(my-tool:*)'],
};

export default config;
`;
}
