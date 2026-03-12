---
title: Configuration
description: Build/runtime config points and where they live.
---

## Key application configs

- Database provider router + Supabase client: `src/integrations/supabase/client.ts`
- SQLite local engine (sql.js / IndexedDB): `src/integrations/database/sqlite-client.ts`
- CSP runtime policy: `src/security/ContentSecurityPolicy.ts`
- Build and chunk strategy: `vite.config.ts`
- PWA manifest and caching: `vite.config.ts` (`VitePWA` section)
- In-app setup SQL script surface: `src/components/Settings.tsx`
- In-app operational SQL tab (setup + migration scripts): `src/components/dashboard/DashboardSettings.tsx`

## SQL script sources

> **Note:** SQL scripts are only required for the **Supabase** provider. SQLite schema is created and seeded automatically on first launch.

- Full setup script: `supabase-setup.sql`
- Existing DB upgrade script: `migration-add-document-misc-types.sql`

## Docs site configs

- Starlight navigation/theme: `website/astro.config.mjs`
- Theme overrides: `website/src/styles/keyper-theme.css`
- Cloudflare Pages config: `website/wrangler.toml`

## Versioning notes

Current package version in app repo is `1.1.1`. Keep app docs, website docs, and distribution artifact references in sync at release time.
