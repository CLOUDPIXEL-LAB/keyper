---
title: Troubleshooting
description: Common issues and practical recovery paths.
---

## Connection test fails

- Confirm Supabase URL uses `http` or `https`.
- Confirm anon/publishable key is used (not service role key).
- Confirm setup SQL has been run successfully.

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
