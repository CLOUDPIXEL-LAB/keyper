---
title: Overview
description: What Keyper is, who it is for, and how the app is structured.
---

Keyper is a self-hosted credential manager built as a browser-first application with client-side encryption and configurable database persistence (Supabase or SQLite).

## Product goals

- Keep secrets under user control through self-hosted data storage.
- Encrypt sensitive credential values before they reach the database.
- Support multiple users on the same instance through `user_id` segmentation.
- Provide a modern PWA experience with installability and fast startup.
- Support both structured and flexible secure payloads, including encrypted document credentials and multiline misc secrets.

## Core runtime shape

- Frontend framework: React + TypeScript + Vite.
- UI shell: single-route app (`/`) with lazy-loaded dashboard modules.
- Data backend: **Supabase (Postgres)** or **SQLite (sql.js / IndexedDB)** — selectable at runtime via in-app settings.
- Security gate: passphrase-based vault unlock before secret operations.

## Primary modules

- App bootstrap: `src/main.tsx`, `src/App.tsx`
- Main shell: `src/components/SelfHostedDashboard.tsx`
- Vault gate: `src/components/PassphraseGate.tsx`
- Crypto and vault: `src/crypto/*`, `src/services/VaultManager.ts`, `src/services/SecureVault.ts`
- Database integration: `src/integrations/supabase/client.ts` (provider router + Supabase client), `src/integrations/database/sqlite-client.ts` (SQLite / sql.js local engine)

## Important behavioral note

Current application behavior is driven by active dashboard components (`AddCredentialModal`, `EditCredentialModal`, `CredentialDetailModal`). Some enhanced encrypted components exist in the codebase but are not the primary path in the current UI.

Credential details now support in-place secret reveal/copy actions in unlocked state, so users can inspect API keys and similar values without entering edit mode.

Current active credential types:

- `api_key`
- `login`
- `secret`
- `token`
- `certificate`
- `document`
- `misc`

For existing databases, run the update script in addition to the setup script so the new types are accepted by the DB constraint:

- `migration-add-document-misc-types.sql`

## Screenshots

For a full visual gallery, visit [Getting Started -> Screenshots](/getting-started/screenshots/).
