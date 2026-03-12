---
title: Runtime Flow
description: Step-by-step application behavior from load to credential operations.
---

## Startup flow

1. `initializeSecurity()` runs from `main.tsx`.
2. Providers are created in `App.tsx`.
3. Router renders `SelfHostedDashboard` for `/`.

## Configuration flow

1. `getDatabaseProvider()` reads the selected provider (`supabase` or `sqlite`) from local storage.
2. If no provider is configured, the database configuration UI is shown.
3. For **Supabase**: credentials are tested and then persisted to local storage; the Supabase client is refreshed with new credentials.
4. For **SQLite**: no credentials are needed; the sql.js engine initialises the schema automatically on first open.

## Vault flow

1. `PassphraseGate` checks whether user is first-time (`vault_config` exists or not).
2. First-time: creates vault (`raw_dek` + `bcrypt_hash`).
3. Existing user: verifies passphrase via bcrypt for new format or unwraps legacy DEK.
4. On unlock, dashboard interactions can encrypt/decrypt secrets.

## Credential flow

1. Add/edit modal captures metadata and secret fields.
2. Secret fields are encrypted via `useEncryption().encryptCredential()`.
3. Row is inserted/updated in `credentials` with `secret_blob` and `encrypted_at`.
4. Edit flow can decrypt `secret_blob` via `useEncryption().decryptCredential()` to prefill fields.
5. Detail flow (`CredentialDetailModal`) also decrypts `secret_blob` when vault is unlocked, allowing secure reveal/copy actions without entering edit mode.

## Auto-lock behavior

- Vault auto-lock timeout defaults to 15 minutes.
- Timer resets on vault activity.
- Lock clears in-memory key references and returns app to locked state.
