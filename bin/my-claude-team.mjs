#!/usr/bin/env node
// Thin shim that runs the compiled CLI, falling back to tsx in dev.
// Note: dynamic import() requires a file:// URL or a package specifier — passing
// a bare absolute path triggers ERR_UNSUPPORTED_ESM_URL_SCHEME on Node 18+.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(here, '../dist/cli/index.js');
const srcEntry = resolve(here, '../src/cli/index.ts');

if (existsSync(distEntry)) {
  await import(pathToFileURL(distEntry).href);
} else if (existsSync(srcEntry)) {
  // Dev fallback: run with tsx. On Windows, npx is `npx.cmd` and spawn
  // can't find it without going through a shell. shell:true is safe here
  // because we control the argv (no user input flows through the shell).
  const child = spawn(
    'npx',
    ['--yes', 'tsx', srcEntry, ...process.argv.slice(2)],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  );
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.error('my-claude-team: no entry point found (neither dist/ nor src/).');
  process.exit(1);
}
