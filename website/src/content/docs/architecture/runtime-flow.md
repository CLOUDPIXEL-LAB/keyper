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

1. `PassphraseGate` loads the active username context and checks whether that user has `vault_config`.
2. Existing user path: verifies passphrase via bcrypt for new format or unwraps legacy DEK.
3. New user path: **Create New User** opens `UserRegistration`, validates uniqueness, and calls `registerNewUser(...)`.
4. Registration creates an isolated vault (`raw_dek` + `bcrypt_hash`) and default categories for that username.
5. On unlock, dashboard interactions can encrypt/decrypt secrets.

## User switching flow

1. `DashboardSettings` -> `User Management` lists registered usernames from `vault_config`.
2. `UserSwitcher` updates active username context and forces a clean reload/lock transition.
3. Target user must still unlock with that user&apos;s passphrase before secrets are readable.

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
