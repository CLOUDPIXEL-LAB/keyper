---
title: Troubleshooting
description: Common issues and practical recovery paths.
---

## Connection test fails

- Confirm Supabase URL uses `http` or `https`.
- Confirm anon/publishable key is used (not service role key).
- Confirm setup SQL has been run successfully.

## SQLite data seems missing

- In browser/PWA mode, SQLite data is stored per browser/app install. Switching browsers, clearing site data, or using a different profile will not show the same local vault.
- In Electron, confirm you are opening the same configured SQLite file path if you chose a custom file-backed database.
- If no SQLite path/name was set, Keyper uses its default local database for that runtime.

## New credential types fail (`document` / `misc`)

- Run `migration-add-document-misc-types.sql` on existing databases.
- Verify the `credentials_credential_type_check` constraint includes `document` and `misc`.
- Re-test create/edit after migration.

## Vault unlock fails

- Verify username context is correct.
- If you recently switched users, use **User Management** again and retry unlock for the intended account.
- Verify passphrase against current `vault_config` row for that `user_id`.
- For new format vaults, ensure `bcrypt_hash` and `raw_dek` both exist.

## New user registration fails

- Confirm the username is unique in `vault_config.user_id`.
- Confirm username format: 3-50 chars, letters/numbers/hyphen/underscore.
- Confirm passphrase is at least 8 characters and matches confirmation.
- If registration started from User Management, allow the lock-screen reload and complete creation there.

## User switching appears stuck

- User switching performs a context reset + reload to avoid cross-user cryptographic state.
- After switch, unlock using the target user&apos;s passphrase.
- Use **Refresh Users** in User Management if a newly created user does not appear immediately.

## Decryption or reveal issues

- Ensure vault is unlocked before revealing secrets.
- Confirm `secret_blob` exists and is valid JSON object with expected fields.
- Inspect browser console for `CryptoError` context.

## UI inconsistencies

Some docs and components in repo represent older flows. If behavior differs, treat active code path in `SelfHostedDashboard` + dashboard modals as authoritative.

## Document preview behavior

- Inline preview currently appears only for text-like files (`text/*`, `.txt`, `.md`).
- Binary uploads (for example `.pdf`, `.doc`, `.docx`, `.odt`) are download-only by design in current release.
