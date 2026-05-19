# Architecture

`my-claude-team` is built around three pure layers separated by typed
contracts. The whole pipeline runs in <1s on a typical repo and is fully
deterministic — given the same input, you get the same output.

```
                ┌────────────────────────────────────────────────┐
                │  CLI (bin/my-claude-team.mjs → src/cli/*)       │
                │  init • scan • generate • doctor               │
                └─────────────────────┬──────────────────────────┘
                                      │
                  ┌───────────────────┴───────────────────┐
                  │                                       │
                  ▼                                       ▼
        ┌──────────────────┐                  ┌──────────────────────┐
        │  Intelligence    │                  │     Generators       │
        │  src/intelligence│ ── RepoProfile ─▶│  src/generators      │
        │  (detectors → )  │                  │  (claude-md, agents, │
        │                  │                  │   skills, commands…) │
        └──────────────────┘                  └──────────────┬───────┘
                                                             │
                                                             ▼
                                                ┌────────────────────┐
                                                │  Markdown + JSON   │
                                                │  written to target │
                                                └────────────────────┘
```

## Layer 1 — Intelligence engine

**Input:** a filesystem path.
**Output:** a `RepoProfile` (see `src/types/profile.ts`).

Each detector is a pure function with no side effects beyond filesystem
reads. Detectors are independent and could be parallelized — we keep them
sequential for clearer error attribution and stable file-read ordering.

| Detector | Signals |
|---|---|
| `package-manager.ts` | Lockfile presence (pnpm/yarn/bun/npm). |
| `monorepo.ts` | Turborepo, Nx, pnpm workspaces, yarn workspaces, lerna. Expands `apps/*`-style globs into concrete workspace entries. |
| `frameworks.ts` | Frontend + backend frameworks via dependency match. Inspects workspace files for tags (e.g. Next.js App Router vs Pages Router). |
| `database.ts` | ORM (Prisma/Drizzle/TypeORM/…), driver (Postgres/MySQL/SQLite/…), schema path, migrations path, RLS markers, table count. |
| `providers.ts` | Auth, storage, payments, UI library, validation library, deployment target. Identifies by package + by env-var prefix. |
| `testing.ts` | Jest/Vitest/Supertest/Playwright/Cypress. TDD signal from colocated `*.spec.ts` files. |
| `ci.ts` | GitHub Actions / GitLab CI / CircleCI + workflow file list. |
| `conventions.ts` | TS strictness, ESLint, Prettier, file naming style. |
| `compliance.ts` | Heuristic scan for encryption, audit_logs, RLS, GDPR, HIPAA markers. |
| `scripts.ts` | Maps `package.json` scripts to canonical commands (`typecheck`, `test`, `build`, `dev`, `lint`). |

Detectors degrade gracefully — when a signal is absent, the field is `null`
and downstream generators omit the corresponding section rather than emit
a placeholder.

## Layer 2 — Generators

**Input:** `GenerationContext = { profile, config, target }`.
**Output:** markdown / JSON files at the target path.

Each artifact has its own generator. Generators consume `RepoProfile`
fields and skip output when prerequisites aren't met. There are no
templates with hardcoded text waiting for substitution — every output is
built up from typed structures with explicit assembly code.

| Generator | Output |
|---|---|
| `claude-md.ts` | Root `CLAUDE.md` (10 sections: what / repo map / scope / build / rules / skills / agents / errors / checklist / style). |
| `index-md.ts` | `.claude/INDEX.md` symbol→file map. |
| `agents/index.ts` | Each `.claude/agents/<id>.md` — frontmatter + ownership + required reads + conventions + workflow + don'ts. |
| `skills/index.ts` | Each `.claude/skills/<id>.md` — when-to-use + required reads + procedure + don'ts. |
| `commands/index.ts` | Each `.claude/commands/<id>.md` — thin dispatcher to skills/agents. |
| `settings.ts` | `.claude/settings.local.json` permission allowlist tuned to detected stack. |
| `config-ts.ts` | Starter `my-claude-team.config.ts` for user overrides. |

The orchestrator (`generators/index.ts`) builds the full **plan** first
(a list of `{ path, content }`), then writes. This makes `--dry-run`
trivial and lets the CLI summarize writes per-file with their action
(`created` / `overwritten` / `skipped` / `unchanged`).

## Layer 3 — CLI

A small, hand-rolled arg parser (`src/cli/index.ts`) routes to four
commands:

- `init` — interactive first-run. Detects, prompts for project metadata,
  asks about overwrite, runs the full generator, prints a summary.
- `scan` — runs detection only; pretty-print or JSON.
- `generate <target>` — regenerate one slice. Targets:
  `all | claude-md | index-md | agents | skills | commands | settings | config`.
- `doctor` — compares the existing `.claude/` tree against what the current
  repo state would generate; reports drift without writing.

The `bin/my-claude-team.mjs` shim runs the compiled `dist/cli/index.js`
when present, otherwise falls back to `tsx` against `src/` for dev use.

## How `/create-my-claude-team-member` works

The slash command is itself a markdown file installed by `init`. When the
user invokes it inside Claude Code, Claude reads the file and follows its
procedure:

1. **Scan** — Claude shells out to `npx my-claude-team scan --json > /tmp/mct-profile.json`.
2. **Diagnose drift** — Claude reads the JSON and the existing `.claude/`
   files, looking for mismatches.
3. **Understand the request** — if `$ARGUMENTS` is non-empty, Claude
   proposes a new agent definition for the user to approve.
4. **Generate** — Claude shells out to `npx my-claude-team generate all`
   (or a narrower target), without `--force` so user-edited files are
   preserved.
5. **Validate** — `npx my-claude-team doctor`.
6. **Verify** — Claude opens one generated file and sanity-checks it.

The CLI handles deterministic work (scan, scaffold, write). The slash
command handles judgment (domain vocabulary, P0 calibration, narrative
polish, decisions about what to overwrite). This split is the design's
core insight: the framework doesn't try to be smart on its own; it's
smart **through Claude**, with deterministic tooling underneath.

## Idempotency + safety

- Every write goes through `writeFileSafe(path, content, mode)` which
  reports `created` / `overwritten` / `skipped` / `unchanged`.
- Default mode is `skip-if-exists` — re-running `init` will never silently
  destroy user edits.
- `--force` opts into overwrite, with explicit summary output per file.
- `--dry-run` returns the plan without touching disk.
- `doctor` is read-only and reports drift; it never modifies.

## Public API

```ts
import type { MyClaudeTeamConfig, RepoProfile } from 'my-claude-team';
import { detectProfile, generateAll } from 'my-claude-team';
```

The library surface is the same code the CLI runs. You can call the
intelligence and generation layers directly from a custom script if you
want to integrate the framework into a higher-level tool.

## What's intentionally not in this design

- **No template engine.** Every output is built from typed structures and
  explicit code. Adding a knob means editing a generator, not finding the
  right `{{token}}`.
- **No "AI-powered" detection.** The intelligence layer is deterministic
  signals (file existence, dependency names, env var prefixes, regex
  scans). LLMs are reserved for the work where they add value — judgment
  inside a Claude Code conversation, not analysis of static files.
- **No global config / per-user state.** Everything lives at the repo
  root. The framework has no opinions about your home directory.
- **No network calls.** Everything runs offline.
