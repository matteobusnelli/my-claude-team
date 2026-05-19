#!/usr/bin/env node
import { runInit } from './init.js';
import { runScan } from './scan.js';
import { runGenerate } from './generate.js';
import { runDoctor } from './doctor.js';
import { log } from '../lib/log.js';

const HELP = `
my-claude-team — context intelligence engine for Claude Code

Usage:
  my-claude-team <command> [options]

Commands:
  init                 Install the my-claude-team setup into the current repo.
                       Detects stack, asks a few questions, generates .claude/.
  scan                 Detect the repository profile and print it (no writes).
                       Use --json for machine-readable output.
  generate [target]    Regenerate specific artifacts. target ∈ all | claude-md |
                       agents | skills | commands | settings. Default: all.
  doctor               Validate an existing .claude/ setup against the current
                       repo profile and report drift.

Options:
  --root <path>        Repo to operate on. Default: cwd.
  --force              Overwrite files even if they exist (default: skip).
  --dry-run            Print what would be written, don't touch disk.
  --json               Machine-readable output (scan only).
  -h, --help           Show this help.
  -v, --version        Show version.

Examples:
  my-claude-team init
  my-claude-team scan --json > profile.json
  my-claude-team generate agents --force
`;

interface ParsedArgs {
  command: string | null;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let command: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-h' || a === '--help') flags.help = true;
    else if (a === '-v' || a === '--version') flags.version = true;
    else if (a === '--force') flags.force = true;
    else if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--json') flags.json = true;
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (!command) {
      command = a;
    } else {
      positional.push(a);
    }
  }
  return { command, positional, flags };
}

async function main(): Promise<void> {
  const { command, positional, flags } = parseArgs(process.argv);

  if (flags.version) {
    // Read version from package.json — keep one source of truth.
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    // Walk up to find package.json. Use parent-equality to detect the root,
    // which works on every OS — on POSIX root is `/`, on Windows it's `C:\`,
    // and in both cases `resolve(root, '..') === root`.
    let dir = here;
    let prev = '';
    while (dir !== prev) {
      try {
        const raw = await readFile(resolve(dir, 'package.json'), 'utf-8');
        const pkg = JSON.parse(raw) as { name: string; version: string };
        if (pkg.name === 'my-claude-team') {
          console.log(pkg.version);
          return;
        }
      } catch {
        // continue
      }
      prev = dir;
      dir = resolve(dir, '..');
    }
    console.log('unknown');
    return;
  }

  if (!command || flags.help) {
    console.log(HELP.trim());
    return;
  }

  const root = typeof flags.root === 'string'
    ? flags.root
    : process.cwd();
  const opts = {
    root,
    force: Boolean(flags.force),
    dryRun: Boolean(flags.dryRun),
    json: Boolean(flags.json),
    full: Boolean(flags.full),
    interactive: Boolean(flags.interactive || flags.i),
    positional,
  };

  try {
    switch (command) {
      case 'init':
        await runInit(opts);
        break;
      case 'scan':
        await runScan(opts);
        break;
      case 'generate':
        await runGenerate(opts);
        break;
      case 'doctor':
        await runDoctor(opts);
        break;
      default:
        log.err(`Unknown command: ${command}`);
        console.log(HELP.trim());
        process.exit(1);
    }
  } catch (err) {
    const e = err as Error;
    log.err(e.message);
    if (process.env.MCT_DEBUG) {
      console.error(e.stack);
    }
    process.exit(1);
  }
}

main();
