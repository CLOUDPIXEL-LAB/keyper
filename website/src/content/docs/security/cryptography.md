---
title: Cryptography
description: Algorithms, formats, and crypto responsibilities across modules.
---

## Credential secret encryption

- Cipher: AES-GCM (Web Crypto API).
- IV: random 96-bit value per encryption.
- Output: `SecretBlobV1` containing `v`, `kdf`, `salt`, `iv`, `ct` fields.

## Key derivation code paths

`src/crypto/crypto.ts` still implements Argon2id/PBKDF2 derivation helpers for legacy and compatibility use cases.

## Current vault strategy

The active vault path in `SecureVault` uses DEK-based encryption:

- DEK is generated once per vault and stored server-side as `raw_dek` (base64).
- Passphrase verification is handled via bcrypt hash comparison.
- DEK import unlocks encrypt/decrypt operations.

## Bcrypt settings

- Default rounds: 12 (`src/crypto/bcrypt.ts`).
- Hash format validated before interpretation.

## Notes for contributors

- Avoid introducing plaintext secret persistence paths.
- Treat `secret_blob` as the single source for sensitive credential payloads.
- Keep algorithm and data-format docs synchronized with `src/crypto/types.ts` and `src/services/SecureVault.ts`.
