---
name: create-web-page
description: Pattern for adding a new page/route in apps/web/ (Next.js). Loaded for Path A frontend work.
---

# Create a page / route

Use when: adding a new page or route segment to `apps/web/` (Next.js app-router/rsc).

## Required reads

- `.claude/skills/rules.md`
- `.claude/skills/security-privacy.md` (if the route is authenticated)

## Decision flow (RSC vs client)

**Default to a Server Component.** Promote to `'use client'` only when you need:
- React state or refs
- Browser-only APIs (window, document, IntersectionObserver, etc.)
- Event handlers that need a client closure

## Procedure

1. **Plan** — route path, data fetches, role gate (if any), interactive behavior.
2. **Page** — write the route file. Keep it presentation-only; push logic into a server function or a hook.
3. **Data** — fetch via the project's fetch wrapper (handles Supabase Auth auth headers).
4. **Empty / error states** — handle them; never ship a page that crashes on empty data.
5. **Verify** — `pnpm typecheck` and a manual smoke run (`pnpm dev`).


## Don't

- Don't fetch on the client when the server can do it.
- Don't import server-only modules into client components.
- Don't reinvent components that exist in shadcn/ui + Tailwind.
