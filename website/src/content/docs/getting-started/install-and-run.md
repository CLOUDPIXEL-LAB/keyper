---
title: Install and Run
description: Install Keyper locally and start the app.
---

## Prerequisites

- Node.js 18+ (newer versions also work)
- A Supabase project and anon/publishable key

## Install options

### Global install

```bash
npm install -g @pinkpixel/keyper
keyper
```

### NPX

```bash
npx @pinkpixel/keyper
```

### Local repo development

```bash
git clone https://github.com/pinkpixel-dev/keyper.git
cd keyper
npm install
npm run build
npm start
```

## First run

1. Open the app URL shown by the CLI (default `http://localhost:4173`).
2. In settings, add your Supabase URL and anon/publishable key.
3. Run the SQL setup script to create required tables/policies.
4. Return to the app, test connection, and save.
5. Unlock or initialize your vault using your master passphrase.

## Verify health

```bash
npm run test:run
npm run build
```

Both commands currently pass on the audited codebase.
