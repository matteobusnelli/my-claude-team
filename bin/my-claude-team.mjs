#!/usr/bin/env node
// Thin shim that runs the compiled CLI, falling back to tsx in dev.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(here, '../dist/cli/index.js');
const srcEntry = resolve(here, '../src/cli/index.ts');

if (existsSync(distEntry)) {
  await import(distEntry);
} else if (existsSync(srcEntry)) {
  // Dev fallback: run with tsx
  const child = spawn(
    'npx',
    ['--yes', 'tsx', srcEntry, ...process.argv.slice(2)],
    { stdio: 'inherit' }
  );
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.error('my-claude-team: no entry point found (neither dist/ nor src/).');
  process.exit(1);
}
