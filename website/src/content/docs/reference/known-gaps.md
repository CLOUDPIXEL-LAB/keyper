---
title: Known Gaps
description: Implementation and documentation gaps observed during repository audit.
---

## Version display drift

- Package version is `1.1.1`.
- Some distribution docs may lag behind package version when new desktop binaries have not been published yet.

## Security/capability drift

- Security docs claim broad migration/analytics experiences that are only partially represented in active UI paths.
- `_headers` CSP is more constrained than dynamic CSP options in app runtime code.

## Active vs legacy component paths

- Active dashboard path uses `AddCredentialModal`, `EditCredentialModal`, `CredentialDetailModal`.
- `EncryptedCredentialForm`, `EncryptedCredentialDetailModal`, and `EncryptedCredentialsApi` exist but are not the main wired flow.
- `CredentialDetailModal` decrypts `secret_blob` for reveal/copy and now handles `document`/`misc` flows in active runtime.

## Data model assumptions

- Current secure path centers on `secret_blob` storage.
- Some legacy plaintext-oriented fields/components still remain in code and can confuse readers.
- `supabase-setup.sql` defines `credentials.secret_blob JSONB NOT NULL`; at the same time, parts of UI/service logic still model metadata-only entries as potentially null `secret_blob`.
- Existing deployments require running `migration-add-document-misc-types.sql` to enable new `document`/`misc` type values in DB constraints.

## Documentation process recommendation

Treat docs as code: tie each page to source-of-truth files and update docs in the same PR as behavior changes.
