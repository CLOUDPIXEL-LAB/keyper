---
title: Database Schema
description: Core tables and policies used by Keyper.
---

## Tables

### `credentials`

Stores metadata and encrypted credential payload:

- identity and metadata fields (`title`, `credential_type`, `priority`, `tags`, etc.)
- encrypted payload field: `secret_blob` (JSONB)
- encryption timestamp: `encrypted_at`
- supported `credential_type` values:
  - `api_key`, `login`, `secret`, `token`, `certificate`, `document`, `misc`

`secret_blob` is the canonical sensitive-data container and now includes document/misc payload keys for active UI flows:

- document keys: `document_name`, `document_mime_type`, `document_content_base64`, `document_size_bytes`
- misc key: `misc_value`

### `vault_config`

Stores vault unlock metadata by user:

- new format: `raw_dek`, `bcrypt_hash`
- legacy format: `wrapped_dek`
- unique per `user_id`
- doubles as the registered-user index used by in-app User Management

Multi-user registration does not use an admin users table. A username is considered registered when a `vault_config` row exists for that `user_id`.

### `categories`

Stores user/category metadata used by dashboard filtering.

## RLS behavior

The setup script enables RLS on all three tables. Current self-hosted policies are permissive (`USING (true)`), while app-level filtering is performed by `user_id` in client queries.

## Functions and triggers

- `update_updated_at_column()` trigger for timestamp maintenance.
- `get_credential_stats()` and `check_rls_status()` helper functions.
- Functions are created with `SECURITY DEFINER` and constrained `search_path`.

## Source of truth

See `supabase-setup.sql` for canonical schema definitions shipped with current releases.

For existing deployments, apply `migration-add-document-misc-types.sql` to upgrade the `credential_type` CHECK constraint without recreating tables or losing data.
