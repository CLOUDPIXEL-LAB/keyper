---
title: Troubleshooting
description: Common issues and practical recovery paths.
---

## Connection test fails

- Confirm Supabase URL uses `http` or `https`.
- Confirm anon/publishable key is used (not service role key).
- Confirm setup SQL has been run successfully.

## New credential types fail (`document` / `misc`)

- Run `migration-add-document-misc-types.sql` on existing databases.
- Verify the `credentials_credential_type_check` constraint includes `document` and `misc`.
- Re-test create/edit after migration.

## Vault unlock fails

- Verify username context is correct.
- Verify passphrase against current `vault_config` row for that `user_id`.
- For new format vaults, ensure `bcrypt_hash` and `raw_dek` both exist.

## Decryption or reveal issues

- Ensure vault is unlocked before revealing secrets.
- Confirm `secret_blob` exists and is valid JSON object with expected fields.
- Inspect browser console for `CryptoError` context.

## UI inconsistencies

Some docs and components in repo represent older flows. If behavior differs, treat active code path in `SelfHostedDashboard` + dashboard modals as authoritative.

## Document preview behavior

- Inline preview currently appears only for text-like files (`text/*`, `.txt`, `.md`).
- Binary uploads (for example `.pdf`, `.doc`, `.docx`, `.odt`) are download-only by design in current release.
