---
title: Install and Run
description: Install Keyper locally and start the app.
---

## Install options

### Option 1: Download a desktop app (no Node required)

Pre-built installers are available on the [GitHub Releases](https://github.com/pinkpixel-dev/keyper/releases/latest) page.

| Platform | Package       | Notes                       |
| -------- | ------------- | --------------------------- |
| Linux    | `.AppImage`   | `chmod +x` then run         |
| Linux    | `.deb`        | `sudo dpkg -i keyper_*.deb` |
| Windows  | `.exe` (NSIS) | Standard installer wizard   |
| macOS    | `.dmg`        | Drag to Applications        |

**Linux AppImage quick start:**

```bash
chmod +x Keyper-1.1.0-x86_64.AppImage
./Keyper-1.1.0-x86_64.AppImage
```

**Linux .deb quick start:**

```bash
sudo dpkg -i keyper_1.1.0_amd64.deb
keyper   # or launch from your applications menu
```

### Option 2: Docker (no Node required)

Prerequisites: Docker + Docker Compose.

```bash
git clone https://github.com/pinkpixel-dev/keyper.git
cd keyper

# Build and start on http://localhost:8080
docker compose up -d

# Custom port
HOST_PORT=3030 docker compose up -d
```

The container exposes the compiled SPA on port 80 internally. No volumes or environment variables are needed — all Supabase credentials are entered in-app and stored in browser `localStorage`.

### Option 3: Global npm install

Prerequisites: Node.js 18+.

```bash
npm install -g @pinkpixel/keyper
keyper
```

### Option 4: NPX (no install)

```bash
npx @pinkpixel/keyper
```

### Option 5: Local repo / development

```bash
git clone https://github.com/pinkpixel-dev/keyper.git
cd keyper
npm install
npm run dev      # Vite dev server
# or
npm run build && npm start   # production preview
```

## First run

1. Open the app URL (default `http://localhost:4173` for npm/npx, `http://localhost:8080` for Docker, or the Electron window).
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
