---
title: Security Model
description: Practical security model implemented in Keyper today.
---

## Core principles

- Client-side encryption for sensitive credential values.
- Passphrase never transmitted as plaintext to backend services.
- Database stores encrypted blobs and vault metadata.
- In-memory vault keying with lock/unlock lifecycle.

## Vault formats

### New format (preferred)

- `vault_config.raw_dek`: base64-encoded data encryption key material.
- `vault_config.bcrypt_hash`: passphrase verifier.
- Unlock sequence: bcrypt verify passphrase -> import DEK -> enable decrypt operations.

### Legacy format (compatibility)

- `vault_config.wrapped_dek` remains supported.
- Unlock sequence derives KEK from passphrase and unwraps DEK.

## Locking

- Manual and automatic locking supported.
- Auto-lock defaults to 15 minutes of inactivity.
- Locking removes active key references from runtime state.

## Browser-side protections

- CSP is configured through `ContentSecurityPolicy.ts` with environment-dependent policy variants.
- Security event logging tracks unlock failures, decrypt errors, and suspicious patterns.

## Threat boundaries

Keyper protects strongly against database disclosure and passive network interception of stored secrets. Like all browser apps, it still depends on endpoint/browser integrity during active sessions.
