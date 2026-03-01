---
title: Known Gaps
description: Implementation and documentation gaps observed during repository audit.
---

## Version display drift

- Package version is `1.0.10`.
- Multiple docs and UI strings still mention `0.1.0` or `1.0.9`.

## Security/capability drift

- Security docs claim broad migration/analytics experiences that are only partially represented in active UI paths.
- `_headers` CSP is more constrained than dynamic CSP options in app runtime code.

## Active vs legacy component paths

- Active dashboard path uses `AddCredentialModal`, `EditCredentialModal`, `CredentialDetailModal`.
- `EncryptedCredentialForm`, `EncryptedCredentialDetailModal`, and `EncryptedCredentialsApi` exist but are not the main wired flow.
- `CredentialDetailModal` still expects legacy plaintext fields for reveal and does not currently decrypt `secret_blob`.

## Data model assumptions

- Current secure path centers on `secret_blob` storage.
- Some legacy plaintext-oriented fields/components still remain in code and can confuse readers.
- `supabase-setup.sql` defines `credentials.secret_blob JSONB NOT NULL`; at the same time, parts of UI/service logic still model metadata-only entries as potentially null `secret_blob`.

## Documentation process recommendation

Treat docs as code: tie each page to source-of-truth files and update docs in the same PR as behavior changes.
