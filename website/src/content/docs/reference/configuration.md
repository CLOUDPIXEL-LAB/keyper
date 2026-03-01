---
title: Configuration
description: Build/runtime config points and where they live.
---

## Key application configs

- Supabase client and local keys: `src/integrations/supabase/client.ts`
- CSP runtime policy: `src/security/ContentSecurityPolicy.ts`
- Build and chunk strategy: `vite.config.ts`
- PWA manifest and caching: `vite.config.ts` (`VitePWA` section)

## Docs site configs

- Starlight navigation/theme: `website/astro.config.mjs`
- Theme overrides: `website/src/styles/keyper-theme.css`
- Cloudflare Pages config: `website/wrangler.toml`

## Versioning notes

Current package version in app repo is `1.0.10`; there are still places in code/docs that display older values (`0.1.0` and `1.0.9`).
