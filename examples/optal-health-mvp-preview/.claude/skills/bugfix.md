---
name: bugfix
description: Systematic bug-fix workflow. Reproduce → diagnose → fix → verify.
---

# Bugfix

## Procedure

1. **Reproduce** — write the minimal command, payload, or click-path that triggers the bug. If you can't reproduce, you can't fix.
2. **Diagnose** — locate the root cause. Don't patch symptoms.
3. **Test** — write a failing test that captures the bug.
4. **Fix** — minimal change to make the test pass. Don't refactor on the way.
5. **Verify auth/redirects** — if the fix touched auth, trace login → middleware → handler for every affected role.
6. **Report** — diff summary, what was tested, any follow-ups that fall out of scope.

## Verification

- `pnpm test` passes (including your new regression test).
- `pnpm typecheck` clean.

## Autonomous mode (when the user says "just fix it")

Skip the report step; ship the diff. Still write the regression test.

## Don't

- Don't expand scope. The PR fixes the bug — nothing else.
- Don't disable the failing test to "unblock" yourself. Fix the cause.
