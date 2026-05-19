---
name: security-privacy
description: Auth, RBAC, encryption, secrets, GDPR/HIPAA controls.
---

# Security & privacy

## Authentication

Auth provider: **Supabase Auth** (package: @supabase/supabase-js, package: @supabase/ssr).

- Token validation runs at the framework guard layer, before any handler logic.
- Never trust client claims — always derive identity from the verified token.


## Authorization
- Three layers when applicable: route gate → handler guard → row-level security.
- Each layer is independent. A bug in one must not silently disable the others.

## Encryption

- Sensitive fields are encrypted at the application layer **before** persistence.
- The encryption key lives in env vars only — never in code, never in fixtures.


## GDPR

- Minimize data collected: only what the feature requires.
- DTOs are the public contract — don't leak internal fields.
- Audit logs are append-only and cover every data-modifying operation.



## Secrets

- Never commit secrets. Use env vars + secrets manager.
- `.env` files are gitignored. Deploy secrets via the Fly.io secrets API.
- Never log raw payloads from auth or billing flows.

## Input validation

- Every public entry point validates with Zod.
- Validation runs at the framework boundary — services trust their inputs.
