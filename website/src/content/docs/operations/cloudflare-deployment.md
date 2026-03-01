---
title: Cloudflare Deployment
description: Deploy the Starlight docs site to Cloudflare Pages.
---

## Build

```bash
npm install
npm run build
```

Output directory is `dist/`.

## Wrangler configuration

`wrangler.toml` in this docs site is configured for Pages static deployment.

## Deploy

### Manual

```bash
npx wrangler pages deploy dist --project-name keyper-docs
```

### Using script

```bash
npm run deploy
```

## Notes

- Update `name` and `project-name` values if your Cloudflare project uses a different slug.
- Set your final production domain in `astro.config.mjs` `site` field for best sitemap/share metadata behavior.
