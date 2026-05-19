---
name: testing
description: Test strategy + critical-path catalog.
---

# Testing

## Stack

- Unit / integration: **Jest**.

- This codebase practices TDD — write the failing test first.

## Layers

- **Unit** — pure functions, services, validators. Fast, no I/O.
- **Integration** — wire to a real database (or in-memory equivalent). Test the contract.


## Critical paths to cover

- Auth: a request without a valid token gets 401.
- Row isolation: a user cannot read another user's rows.
- Audit immutability: UPDATE/DELETE on `audit_logs` is rejected by the DB.
- Encryption roundtrip: a stored value is unreadable in the DB and recoverable through the service.
- Validation: malformed payloads are rejected by Zod with a 4xx, not crashing the server.
- Stripe webhook: invalid signatures are rejected.

## Don't

- Don't test the framework. Test your code.
- Don't ship `.only` or `.skip`.
- Don't mock what you own. Mock at network / IO boundaries.
