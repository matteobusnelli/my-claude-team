/**
 * Top-level generator: takes a GenerationContext and emits the entire .claude/
 * tree plus CLAUDE.md and my-claude-team.config.ts at the target root.
 *
 * Idempotency is enforced via WriteMode — by default `skip-if-exists`, so a
 * second `init` run is safe. `--force` switches to `overwrite`. Both modes
 * report a WriteResult per file so the CLI can summarize at the end.
 */

import { join } from 'node:path';
import type { GenerationContext } from '../types/config.js';
import { writeFileSafe, type WriteMode, type WriteResult } from '../lib/fs.js';
import { generateClaudeMd } from './claude-md.js';
import { generateIndexMd } from './index-md.js';
import { generateSettings } from './settings.js';
import { generateConfigTs } from './config-ts.js';
import { generateAgent } from './agents/index.js';
import { generateSkill } from './skills/index.js';
import { generateCommand } from './commands/index.js';
import { selectAgents, selectCommands, selectSkills } from './shared.js';

export interface GenerateOptions {
  /** Which artifact group to generate. 'all' covers everything. */
  target: 'all' | 'claude-md' | 'index-md' | 'agents' | 'skills' | 'commands' | 'settings' | 'config';
  mode: WriteMode;
  /** When true, return the would-write content instead of touching disk. */
  dryRun?: boolean;
}

export interface GenerationPlan {
  path: string;
  content: string;
  group: string;
}

export interface GenerationReport {
  plans: GenerationPlan[];
  results: WriteResult[];
}

/**
 * Build the full plan first, then write. Two passes makes dry-run trivial
 * and lets the CLI show a clean summary.
 */
export async function generateAll(
  ctx: GenerationContext,
  opts: GenerateOptions
): Promise<GenerationReport> {
  const plans: GenerationPlan[] = [];
  const target = opts.target;

  const want = (group: string) => target === 'all' || target === group;

  if (want('claude-md')) {
    plans.push({
      path: join(ctx.target, 'CLAUDE.md'),
      content: generateClaudeMd(ctx),
      group: 'claude-md',
    });
  }

  if (want('index-md')) {
    plans.push({
      path: join(ctx.target, '.claude', 'INDEX.md'),
      content: generateIndexMd(ctx),
      group: 'index-md',
    });
  }

  if (want('agents')) {
    for (const id of selectAgents(ctx.profile)) {
      plans.push({
        path: join(ctx.target, '.claude', 'agents', `${id}.md`),
        content: generateAgent(id, ctx),
        group: 'agents',
      });
    }
  }

  if (want('skills')) {
    for (const id of selectSkills(ctx.profile)) {
      plans.push({
        path: join(ctx.target, '.claude', 'skills', `${id}.md`),
        content: generateSkill(id, ctx),
        group: 'skills',
      });
    }
  }

  if (want('commands')) {
    for (const id of selectCommands(ctx.profile)) {
      plans.push({
        path: join(ctx.target, '.claude', 'commands', `${id}.md`),
        content: generateCommand(id, ctx),
        group: 'commands',
      });
    }
  }

  if (want('settings')) {
    plans.push({
      path: join(ctx.target, '.claude', 'settings.local.json'),
      content: generateSettings(ctx),
      group: 'settings',
    });
  }

  if (want('config')) {
    plans.push({
      path: join(ctx.target, 'my-claude-team.config.ts'),
      content: generateConfigTs(ctx),
      group: 'config',
    });
  }

  if (opts.dryRun) {
    return { plans, results: [] };
  }

  const results: WriteResult[] = [];
  for (const p of plans) {
    const result = await writeFileSafe(p.path, p.content, opts.mode);
    results.push(result);
  }
  return { plans, results };
}
