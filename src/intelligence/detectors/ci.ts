import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CIInfo } from '../../types/profile.js';

export async function detectCI(root: string): Promise<CIInfo | null> {
  const gha = join(root, '.github/workflows');
  if (existsSync(gha)) {
    try {
      const files = (await fs.readdir(gha))
        .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
        .map((f) => `.github/workflows/${f}`);
      return { platform: 'github-actions', workflowFiles: files };
    } catch {
      // ignore
    }
  }
  if (existsSync(join(root, '.gitlab-ci.yml'))) {
    return { platform: 'gitlab-ci', workflowFiles: ['.gitlab-ci.yml'] };
  }
  if (existsSync(join(root, '.circleci/config.yml'))) {
    return { platform: 'circleci', workflowFiles: ['.circleci/config.yml'] };
  }
  return null;
}
