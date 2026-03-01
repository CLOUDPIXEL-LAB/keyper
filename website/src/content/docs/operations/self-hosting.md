---
title: Self-Hosting
description: Self-hosting behavior and environment assumptions for the Keyper app.
---

This docs site describes the Keyper app's self-hosted runtime model.

## Runtime assumptions in app code

- Supabase URL/key are supplied by the user at runtime and stored in local storage.
- Username context is also local-storage driven (`keyper-username`).
- Credential and category table access is filtered by `user_id` in client queries.

## Operational recommendations

- Run Keyper over HTTPS in production.
- Keep Supabase project credentials and policies tightly controlled.
- Validate that SQL setup script matches current app release before onboarding users.
- Periodically audit docs against implementation to avoid security misunderstandings.
