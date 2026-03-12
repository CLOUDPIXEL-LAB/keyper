---
title: System Overview
description: High-level architecture and module boundaries.
---

## Layers

1. UI layer: Dashboard, filters, modals, settings, passphrase gate.
2. Vault layer: in-memory unlock state, DEK management, encrypt/decrypt operations.
3. Storage layer: Supabase (Postgres) or SQLite (sql.js / IndexedDB) tables for credentials, categories, and vault config — selected at runtime via the database provider setting.

## Key data path

1. User enters secret in credential form.
2. Vault must be unlocked.
3. Secret payload is JSON-serialized and encrypted via AES-GCM using in-memory DEK.
4. Encrypted blob is written to `credentials.secret_blob`.
5. Decryption happens in browser after explicit reveal action.

## Entry points

- `src/main.tsx` initializes CSP/security hooks and renders app.
- `src/App.tsx` wires providers (query, theme, router).
- `src/components/SelfHostedDashboard.tsx` manages configured/unconfigured states and dashboard routes.

## Stateful responsibilities

- `SelfHostedDashboard`: app-level view and filtering state.
- `PassphraseGate`: vault lock/unlock UX and first-time setup branching.
- `VaultManager`: orchestrates storage config + secure vault runtime.
- `SecureVault`: cryptographic operations and auto-lock timer.
