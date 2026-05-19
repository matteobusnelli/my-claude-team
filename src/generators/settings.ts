import type { GenerationContext } from '../types/config.js';
import type { RepoProfile } from '../types/profile.js';

/**
 * Generate settings.local.json with a sensible permission allowlist for the
 * detected stack. We err on the side of common safe commands — anything
 * destructive or stack-specific still triggers a prompt unless the user
 * extends the list via my-claude-team.config.ts#permissions.
 */
export function generateSettings(ctx: GenerationContext): string {
  const { profile, config } = ctx;
  const allow = new Set<string>([
    ...defaultPermissions(profile),
    ...(config.permissions ?? []),
  ]);

  const settings = {
    permissions: { allow: Array.from(allow).sort() },
    hooks: config.hooks ?? {
      PostToolUse: [{ matcher: 'Edit|Write', hooks: [] }],
    },
  };
  return JSON.stringify(settings, null, 2) + '\n';
}

function defaultPermissions(profile: RepoProfile): string[] {
  const out: string[] = [
    // Read-only essentials
    'Bash(ls:*)',
    'Bash(cat)',
    'Bash(find:*)',
    'Bash(grep:*)',
    'Bash(rg:*)',
    'Bash(wc:*)',
    'Bash(git status:*)',
    'Bash(git diff:*)',
    'Bash(git log:*)',
    'Bash(git show:*)',
    'Bash(git branch:*)',
    'Bash(gh pr view:*)',
    'Bash(gh pr diff:*)',
    'Bash(gh pr create:*)',
    'Bash(gh api:*)',
  ];

  const pm = profile.packageManager;
  if (pm) {
    out.push(`Bash(${pm} install:*)`);
    out.push(`Bash(${pm} run *)`);
    if (pm === 'pnpm') {
      out.push('Bash(pnpm dev:*)', 'Bash(pnpm build:*)', 'Bash(pnpm test:*)', 'Bash(pnpm lint:*)', 'Bash(pnpm typecheck:*)');
      out.push('Bash(pnpm -F * dev:*)', 'Bash(pnpm -F * build:*)', 'Bash(pnpm -F * test:*)', 'Bash(pnpm -F * lint:*)', 'Bash(pnpm -F * typecheck:*)');
      out.push('Bash(pnpm turbo run *)');
      out.push('Bash(pnpm add:*)', 'Bash(pnpm remove:*)');
    } else if (pm === 'yarn') {
      out.push('Bash(yarn dev:*)', 'Bash(yarn build:*)', 'Bash(yarn test:*)', 'Bash(yarn lint:*)', 'Bash(yarn typecheck:*)');
      out.push('Bash(yarn workspace * *)');
    } else if (pm === 'bun') {
      out.push('Bash(bun dev:*)', 'Bash(bun build:*)', 'Bash(bun test:*)', 'Bash(bun run *)');
    } else {
      out.push('Bash(npm test:*)', 'Bash(npm run *)');
    }
  }

  if (profile.database?.orm === 'prisma') {
    out.push('Bash(npx prisma:*)');
  }
  if (profile.auth?.name === 'Supabase Auth' || profile.storage?.name === 'Supabase Storage') {
    out.push('Bash(supabase status:*)', 'Bash(supabase db reset:*)', 'Bash(supabase db push:*)', 'Bash(supabase migration *)');
    out.push('Bash(psql:*)');
  }
  if (profile.deployment?.name === 'Fly.io') {
    out.push('Bash(flyctl deploy:*)', 'Bash(flyctl status:*)', 'Bash(flyctl logs:*)', 'Bash(flyctl secrets list:*)');
  }
  if (profile.deployment?.name === 'Docker' || profile.deployment?.name === 'Fly.io') {
    out.push('Bash(docker build:*)', 'Bash(docker port:*)');
  }
  if (profile.deployment?.name === 'Vercel') {
    out.push('Bash(vercel:*)');
  }

  return out;
}
