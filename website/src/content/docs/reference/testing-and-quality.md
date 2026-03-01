---
title: Testing and Quality
description: Verification status and quality tooling.
---

## Current verified state

Verified directly on March 1, 2026:

- `npm run test:run` passes with 50 tests.
- `npm run build` passes and generates production bundles/PWA artifacts.

## Test coverage areas

- Core crypto utility behavior (`src/crypto/__tests__/crypto.test.ts`)
- Encryption best-practice scenarios (`src/crypto/__tests__/encryption-best-practices.test.ts`)
- Basic test harness sanity (`src/simple.test.ts`)

## Quality tooling

- Linting: ESLint with TypeScript + React hooks configuration.
- TypeScript: relatively permissive in app tsconfig (`strict` disabled in app config).
- Build: Vite + PWA plugin with explicit chunking strategy.

## Recommendation

Prioritize integration tests around active dashboard CRUD + vault lock/unlock behavior to reduce regressions in real user workflows.
