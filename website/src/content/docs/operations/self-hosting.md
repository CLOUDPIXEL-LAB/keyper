---
title: Self-Hosting
description: Self-hosting behavior and environment assumptions for the Keyper app.
---

This page covers the different ways to self-host Keyper and the runtime model that applies to each.

## Runtime assumptions in app code

- Supabase URL/key are supplied by the user at runtime and stored in local storage.
- Username context is also local-storage driven (`keyper-username`).
- Credential and category table access is filtered by `user_id` in client queries.

## Deployment options

### Docker (recommended for servers)

The Docker image serves the compiled Vite/React SPA from nginx. No Node.js runtime is required in production.

**Quick start with Docker Compose:**

```bash
git clone https://github.com/pinkpixel-dev/keyper.git
cd keyper

# Start on http://localhost:8080
docker compose up -d

# Use a different host port
HOST_PORT=3030 docker compose up -d

# Rebuild after source changes
docker compose up -d --build

# Stop
docker compose down

# View logs
docker compose logs -f
```

**Check container health:**

```bash
curl http://localhost:8080/healthz
# returns: ok
```

**Run without Compose:**

```bash
docker build -t keyper .
docker run -d -p 8080:80 --name keyper --restart unless-stopped keyper
```

No environment variables or volumes are required. All Supabase credentials are entered in-app and persist only in the user's browser `localStorage`.

### HTTPS in production

For HTTPS, place a reverse proxy (Caddy, nginx, Traefik) in front of the container. Example Caddy snippet:

```
keyper.example.com {
    reverse_proxy keyper:80
}
```

The container itself does not terminate TLS.

### npm / Node.js server

For Node.js environments, the CLI `bin/keyper.js` starts a Vite preview server on port 4173 (configurable via `--port`):

```bash
npm install -g @pinkpixel/keyper
keyper --port 4173
```

### Electron desktop app

See [Install and Run](/getting-started/install-and-run/) for download links and install instructions for the desktop installer packages (AppImage, deb, macOS dmg).

## Operational recommendations

- Run Keyper over HTTPS in production.
- Keep Supabase project credentials and policies tightly controlled.
- Validate that the SQL setup script matches the current app release before onboarding users.
- For existing databases, apply release migrations (for example `migration-add-document-misc-types.sql`) before enabling new credential features in production.
- Periodically audit docs against implementation to avoid security misunderstandings.
- Row Level Security is enabled on all Supabase tables — do not disable it.
