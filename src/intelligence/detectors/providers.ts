import { join } from 'node:path';
import type { MonorepoInfo, ProviderInfo } from '../../types/profile.js';
import { readJsonMaybe, readMaybe } from '../../lib/fs.js';

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Collect all dependencies across the monorepo + look at .env / .env.example
 * for additional provider signals (some providers ship multiple npm packages
 * so we identify by name + by env var prefix).
 */
async function collectSignals(
  root: string,
  monorepo: MonorepoInfo | null
): Promise<{ deps: Set<string>; envKeys: Set<string> }> {
  const deps = new Set<string>();
  const paths = ['.', ...(monorepo?.workspaces.map((w) => w.path) ?? [])];
  for (const p of paths) {
    const pkg = await readJsonMaybe<PkgJson>(join(root, p, 'package.json'));
    if (!pkg) continue;
    for (const k of Object.keys(pkg.dependencies ?? {})) deps.add(k);
    for (const k of Object.keys(pkg.devDependencies ?? {})) deps.add(k);
  }

  const envKeys = new Set<string>();
  const envFiles = ['.env.example', '.env', '.env.local'];
  for (const f of envFiles) {
    const content = await readMaybe(join(root, f));
    if (!content) continue;
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Z][A-Z0-9_]+)=/);
      if (m && m[1]) envKeys.add(m[1]);
    }
  }
  return { deps, envKeys };
}

interface Match {
  /** What we found. */
  evidence: string;
}

function depEvidence(deps: Set<string>, name: string): Match | null {
  return deps.has(name) ? { evidence: `package: ${name}` } : null;
}
function envEvidence(envKeys: Set<string>, prefix: string): Match | null {
  for (const k of envKeys) {
    if (k.startsWith(prefix)) return { evidence: `env: ${k}` };
  }
  return null;
}

export async function detectProviders(
  root: string,
  monorepo: MonorepoInfo | null
): Promise<{
  auth: ProviderInfo | null;
  storage: ProviderInfo | null;
  payments: ProviderInfo | null;
  deployment: ProviderInfo | null;
  ui: ProviderInfo | null;
  validation: ProviderInfo | null;
}> {
  const { deps, envKeys } = await collectSignals(root, monorepo);

  // --- Auth ---
  let auth: ProviderInfo | null = null;
  const authChecks: { name: string; matches: Match[] }[] = [
    { name: 'Supabase Auth', matches: gather([
      depEvidence(deps, '@supabase/supabase-js'),
      depEvidence(deps, '@supabase/ssr'),
      envEvidence(envKeys, 'SUPABASE_'),
    ]) },
    { name: 'Clerk', matches: gather([
      depEvidence(deps, '@clerk/nextjs'),
      depEvidence(deps, '@clerk/clerk-sdk-node'),
      envEvidence(envKeys, 'CLERK_'),
    ]) },
    { name: 'NextAuth', matches: gather([
      depEvidence(deps, 'next-auth'),
      depEvidence(deps, '@auth/core'),
    ]) },
    { name: 'Auth0', matches: gather([
      depEvidence(deps, '@auth0/nextjs-auth0'),
      depEvidence(deps, 'auth0'),
      envEvidence(envKeys, 'AUTH0_'),
    ]) },
    { name: 'Firebase Auth', matches: gather([
      depEvidence(deps, 'firebase'),
      depEvidence(deps, 'firebase-admin'),
    ]) },
  ];
  for (const c of authChecks) {
    if (c.matches.length > 0) {
      auth = { name: c.name, evidence: c.matches.map((m) => m.evidence) };
      break;
    }
  }

  // --- Storage ---
  let storage: ProviderInfo | null = null;
  const storageChecks: { name: string; matches: Match[] }[] = [
    { name: 'Supabase Storage', matches: gather([
      depEvidence(deps, '@supabase/supabase-js'),
      envEvidence(envKeys, 'SUPABASE_'),
    ]) },
    { name: 'AWS S3', matches: gather([
      depEvidence(deps, '@aws-sdk/client-s3'),
      envEvidence(envKeys, 'AWS_'),
      envEvidence(envKeys, 'S3_'),
    ]) },
    { name: 'Cloudflare R2', matches: gather([
      envEvidence(envKeys, 'R2_'),
      envEvidence(envKeys, 'CLOUDFLARE_'),
    ]) },
    { name: 'Google Cloud Storage', matches: gather([
      depEvidence(deps, '@google-cloud/storage'),
      envEvidence(envKeys, 'GCS_'),
    ]) },
    { name: 'UploadThing', matches: gather([
      depEvidence(deps, 'uploadthing'),
      depEvidence(deps, '@uploadthing/react'),
    ]) },
  ];
  for (const c of storageChecks) {
    if (c.matches.length > 0) {
      storage = { name: c.name, evidence: c.matches.map((m) => m.evidence) };
      break;
    }
  }

  // --- Payments ---
  let payments: ProviderInfo | null = null;
  const payChecks: { name: string; matches: Match[] }[] = [
    { name: 'Stripe', matches: gather([
      depEvidence(deps, 'stripe'),
      depEvidence(deps, '@stripe/stripe-js'),
      envEvidence(envKeys, 'STRIPE_'),
    ]) },
    { name: 'Paddle', matches: gather([
      depEvidence(deps, '@paddle/paddle-node-sdk'),
      envEvidence(envKeys, 'PADDLE_'),
    ]) },
    { name: 'Lemon Squeezy', matches: gather([
      depEvidence(deps, '@lemonsqueezy/lemonsqueezy.js'),
      envEvidence(envKeys, 'LEMON_'),
    ]) },
  ];
  for (const c of payChecks) {
    if (c.matches.length > 0) {
      payments = { name: c.name, evidence: c.matches.map((m) => m.evidence) };
      break;
    }
  }

  // --- Deployment ---
  let deployment: ProviderInfo | null = null;
  const depChecks: { name: string; matches: Match[] }[] = [
    { name: 'Vercel', matches: gather([
      depEvidence(deps, '@vercel/analytics'),
      depEvidence(deps, '@vercel/edge'),
      ...(await fileExists(root, 'vercel.json')),
    ]) },
    { name: 'Fly.io', matches: gather(await fileExists(root, 'fly.toml', 'apps/api/fly.toml', 'apps/web/fly.toml')) },
    { name: 'Render', matches: gather(await fileExists(root, 'render.yaml')) },
    { name: 'Railway', matches: gather(await fileExists(root, 'railway.toml', 'railway.json')) },
    { name: 'Netlify', matches: gather(await fileExists(root, 'netlify.toml')) },
    { name: 'Cloudflare Workers', matches: gather([
      depEvidence(deps, 'wrangler'),
      ...(await fileExists(root, 'wrangler.toml')),
    ]) },
    { name: 'Docker', matches: gather(await fileExists(root, 'Dockerfile')) },
  ];
  for (const c of depChecks) {
    if (c.matches.length > 0) {
      deployment = { name: c.name, evidence: c.matches.map((m) => m.evidence) };
      break;
    }
  }

  // --- UI ---
  let ui: ProviderInfo | null = null;
  const uiChecks: { name: string; matches: Match[] }[] = [
    { name: 'shadcn/ui + Tailwind', matches: gather([
      depEvidence(deps, '@radix-ui/react-slot'),
      depEvidence(deps, 'class-variance-authority'),
      depEvidence(deps, 'tailwindcss'),
    ]) },
    { name: 'Tailwind CSS', matches: gather([depEvidence(deps, 'tailwindcss')]) },
    { name: 'Chakra UI', matches: gather([depEvidence(deps, '@chakra-ui/react')]) },
    { name: 'Mantine', matches: gather([depEvidence(deps, '@mantine/core')]) },
    { name: 'Material UI', matches: gather([depEvidence(deps, '@mui/material')]) },
    { name: 'Ant Design', matches: gather([depEvidence(deps, 'antd')]) },
  ];
  for (const c of uiChecks) {
    if (c.matches.length > 0) {
      ui = { name: c.name, evidence: c.matches.map((m) => m.evidence) };
      break;
    }
  }

  // --- Validation ---
  let validation: ProviderInfo | null = null;
  const valChecks: { name: string; matches: Match[] }[] = [
    { name: 'Zod', matches: gather([depEvidence(deps, 'zod')]) },
    { name: 'Valibot', matches: gather([depEvidence(deps, 'valibot')]) },
    { name: 'Yup', matches: gather([depEvidence(deps, 'yup')]) },
    { name: 'class-validator', matches: gather([depEvidence(deps, 'class-validator')]) },
    { name: 'Joi', matches: gather([depEvidence(deps, 'joi')]) },
    { name: 'ArkType', matches: gather([depEvidence(deps, 'arktype')]) },
  ];
  for (const c of valChecks) {
    if (c.matches.length > 0) {
      validation = { name: c.name, evidence: c.matches.map((m) => m.evidence) };
      break;
    }
  }

  return { auth, storage, payments, deployment, ui, validation };
}

function gather(maybes: (Match | null)[]): Match[] {
  return maybes.filter((m): m is Match => m !== null);
}

async function fileExists(root: string, ...paths: string[]): Promise<Match[]> {
  const out: Match[] = [];
  for (const p of paths) {
    const content = await readMaybe(join(root, p));
    if (content !== null) out.push({ evidence: `file: ${p}` });
  }
  return out;
}
