# Keyper Docs Website

This directory contains the Astro + Starlight documentation site for Keyper.

## Local development

```bash
cd website
npm install
npm run dev
```

Docs preview will run at `http://localhost:4321` by default.

## Build

```bash
cd website
npm run build
npm run preview
```

## Content locations

- Main docs pages: `website/src/content/docs/`
- Images/static assets: `website/public/`
- Site config: `website/astro.config.mjs`

## Doc update policy

When core app behavior changes, update these docs in the same change:

- Getting started (`getting-started/*`)
- Data model (`data/*`)
- Troubleshooting (`operations/troubleshooting.md`)
- Known gaps (`reference/known-gaps.md`)
