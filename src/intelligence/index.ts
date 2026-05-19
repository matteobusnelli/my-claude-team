import { join } from 'node:path';
import type { RepoProfile } from '../types/profile.js';
import { readJsonMaybe } from '../lib/fs.js';
import { detectPackageManager } from './detectors/package-manager.js';
import { detectMonorepo } from './detectors/monorepo.js';
import { detectFrameworks } from './detectors/frameworks.js';
import { detectDatabase } from './detectors/database.js';
import { detectProviders } from './detectors/providers.js';
import { detectTesting } from './detectors/testing.js';
import { detectCI } from './detectors/ci.js';
import {
  detectConventions,
  detectLanguage,
  detectLayout,
} from './detectors/conventions.js';
import { detectCompliance } from './detectors/compliance.js';
import { detectScripts, projectNameFrom } from './scripts.js';

/**
 * Top-level intelligence entry point. Runs every detector and assembles a
 * RepoProfile. Detectors are independent and could be parallelized, but on
 * a typical repo the whole pass is <1s — we keep it sequential for clearer
 * error attribution and stable file-read ordering.
 */
export async function detectProfile(root: string): Promise<RepoProfile> {
  const pkg = await readJsonMaybe<{ name?: string }>(join(root, 'package.json'));
  const packageManager = detectPackageManager(root);
  const monorepo = await detectMonorepo(root);
  const { frontend, backend } = await detectFrameworks(root, monorepo);
  const database = await detectDatabase(root, monorepo);
  const providers = await detectProviders(root, monorepo);
  const testing = await detectTesting(root, monorepo);
  const ci = await detectCI(root);
  const language = await detectLanguage(root);
  const conventions = await detectConventions(root);
  const layout = await detectLayout(root);
  const compliance = await detectCompliance(root, monorepo);
  const scripts = await detectScripts(root, packageManager);

  return {
    root,
    name: projectNameFrom(root, pkg),
    packageManager,
    monorepo,
    language,
    frontend,
    backend,
    database,
    auth: providers.auth,
    storage: providers.storage,
    ui: providers.ui,
    validation: providers.validation,
    testing,
    payments: providers.payments,
    ci,
    deployment: providers.deployment,
    compliance,
    scripts,
    layout,
    conventions,
  };
}

export { detectScripts, projectNameFrom } from './scripts.js';
