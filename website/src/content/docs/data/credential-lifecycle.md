---
title: Credential Lifecycle
description: How credentials are created, updated, revealed, and deleted.
---

## Create

1. User fills form in `AddCredentialModal`.
2. Secret fields are packaged by `useEncryption().encryptCredential()`.
3. Encrypted blob is written to `credentials.secret_blob`.
4. Metadata is stored alongside encryption timestamp.

## Update

1. `EditCredentialModal` loads row metadata and decrypts existing `secret_blob` if vault is unlocked.
2. Updated secret values are re-encrypted.
3. Update payload explicitly includes valid DB columns.

## Reveal

1. Edit flow (`EditCredentialModal`) decrypts `secret_blob` when vault is unlocked and pre-fills form values.
2. Detail flow (`CredentialDetailModal`) decrypts `secret_blob` when vault is unlocked and exposes reveal/copy controls for sensitive fields.
3. If the vault is locked, detail view shows a helper message prompting unlock before revealing encrypted values.

## Delete

- `CredentialDetailModal` deletes row by `id` after user confirmation.

## Search and filter

- In-memory filtering by title, description, category, type, and tags.
- Category list merged from default and user-specific categories.

## Compatibility notes

Some legacy plaintext-oriented fields/components still exist; current expected secure path is `secret_blob` driven.
