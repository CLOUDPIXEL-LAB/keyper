# Keyper — Workspace Instructions

## General Rules

- Always sound friendly and engaged with this project.
- Use all available agents, skills, and tools autonomously as needed.
- Always refer to all instruction files at the start of new tasks.
- Use Context7 tools for up-to-date framework/API documentation before coding.
- Check the system date/time before updating CHANGELOG.md.
- Thoroughly understand the full codebase context before making any changes. When uncertain, ask for clarification.
- Keep `OVERVIEW.md` (technical overview document), `README.md`, and `CHANGELOG.md` current. Create them if they don't exist.
- Create an Apache 2.0 `LICENSE` file if none exists.
- Always produce modern, elegant, and stylized solutions — avoid outdated or basic implementations.

**Important:** Do NOT change files unless you fully understand the project structure and intent.

---

## Owner / Branding

- **Name:** Pink Pixel
- **Website:** [pinkpixel.dev](https://pinkpixel.dev)
- **GitHub:** [github.com/pinkpixel-dev](https://github.com/pinkpixel-dev)
- **Email:** admin@pinkpixel.dev
- **Support Email:** support@pinkpixel.dev
- **Discord:** @sizzlebopz
- **Funding:** [buymeacoffee.com/pinkpixel](https://www.buymeacoffee.com/pinkpixel) · [ko-fi.com/sizzlebop](https://ko-fi.com/sizzlebop)
- **Tagline:** "Dream it, Pixel it ✨”
- **Signature:** “Made with 💖 by Pink Pixel”

---

## Project Overview

**Keyper** v1.1.1 (`@pinkpixel/keyper`) is a **self-hosted, zero-knowledge credential manager**.
All encryption is client-side (browser/Electron). Even the DB admin cannot read stored secrets.

Deployment modes: PWA · Docker/nginx container · Electron desktop app · `npm install -g @pinkpixel/keyper`

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript 5.8 + Vite 7 (`@vitejs/plugin-react-swc`) |
| Styling | **Tailwind CSS v3** (PostCSS, `tailwind.config.ts`) + shadcn/ui + Radix UI |
| State | TanStack React Query 5 + React Hook Form + Zod |
| Routing | React Router v6 `BrowserRouter` — two routes: `/` and `*` (404) |
| Cryptography | `argon2-browser` (Argon2id WASM) · Web Crypto API (AES-256-GCM, PBKDF2 fallback) · `bcryptjs` (12 rounds) |
| DB — cloud | Supabase JS SDK 2 (PostgreSQL + RLS) |
| DB — browser | `sql.js` 1.12 (SQLite WASM + IndexedDB persistence) |
| DB — desktop | `better-sqlite3` via Electron IPC |
| Desktop | Electron 33 (custom `app://` scheme, `contextBridge`) |
| Icons | Lucide React |
| Theming | `next-themes` (class-based dark mode) |
| Testing | Vitest |
| Linting | ESLint |
| Deployment | Cloudflare Pages (`wrangler`) · Docker · npm publish |

---

## Architecture

```
Browser / Electron
  └─ React SPA (Vite)
        └─ PassphraseGate          ← vault unlock / first-time setup
              └─ SelfHostedDashboard   ← main credential shell
                    ├─ VaultManager → SecureVault → crypto.ts → Web Crypto API
                    └─ EncryptedCredentialsApi → DB provider router
                                                      ├─ Supabase (cloud)
                                                      ├─ sql.js WASM (browser local)
                                                      └─ better-sqlite3 IPC (Electron)
```

### Key Files

| File | Purpose |
|---|---|
| `src/App.tsx` | Root: QueryClient → ThemeProvider → BrowserRouter → 2 routes |
| `src/main.tsx` | Entry: CSP init → render App |
| `src/index.css` | Tailwind import + HSL CSS custom properties (dark theme only) |
| `src/components/SelfHostedDashboard.tsx` | Main app shell, DB config, lazy sub-components |
| `src/components/PassphraseGate.tsx` | Vault unlock UI, passphrase strength, auto-lock countdown |
| `src/components/Settings.tsx` | DB provider switcher (Supabase ↔ SQLite), connection test |
| `src/components/dashboard/` | 9 focused components (header, search, grid, add/edit/detail modals) |
| `src/components/ui/` | 45 shadcn/ui primitives |
| `src/crypto/crypto.ts` | `encryptString()` / `decryptString()` / `deriveKey()` |
| `src/crypto/bcrypt.ts` | `hashPassphrase()` / `verifyPassphrase()` |
| `src/services/SecureVault.ts` | In-memory DEK; auto-lock timer; pub/sub vault events |
| `src/services/VaultManager.ts` | Singleton: vault setup, unlock, lock, passphrase reset |
| `src/services/EncryptedCredentialsApi.ts` | Full CRUD for encrypted credentials (`secret_blob` JSONB) |
| `src/hooks/useVault.ts` | React hook: `isUnlocked`, `unlock()`, `lock()`, `encrypt()`, `decrypt()` |
| `src/integrations/supabase/client.ts` | Supabase client + DB provider registry + localStorage key constants |
| `src/integrations/database/sqlite-client.ts` | SQLite router (Electron IPC vs sql.js WASM) |
| `src/security/ContentSecurityPolicy.ts` | Programmatic CSP meta-tag injection at startup |
| `src/security/PassphraseValidator.ts` | `analyzePassphrase()` + strength scoring |
| `electron/main.ts` | Main process: `app://` scheme, window, IPC handlers, `better-sqlite3` |
| `electron/preload.ts` | `contextBridge` → `window.keyperElectron` |
| `bin/keyper.js` | CLI: starts `vite preview` server |
| `supabase-setup.sql` | Full DB schema + RLS policies |
| `website/` | Separate Astro marketing site (independent build) |

---

## Build & Test Commands

```bash
npm run dev              # dev server (port 4173)
npm run build            # production build → dist/
npm run test:run         # single-pass tests (CI)
npm run test             # watch mode
npm run test:coverage    # coverage report
npm run lint             # ESLint

# Electron
npm run electron:dev          # build + compile + launch with DevTools
npm run electron:build:linux  # AppImage + .deb

# Deploy
npm run deploy:build          # build + Cloudflare Pages deploy
```

---

## Styling Conventions

- **Tailwind v3** via PostCSS — use `tailwind.config.ts` patterns. Do **not** use v4 CSS-first syntax.
- **Dark-only** theme — `:root` defines only dark HSL values. No light mode palette exists.
- Primary accent: cyan (`--primary: 188 95% 52%` ≈ `cyan-500`).
- Background: very dark navy (`--background: 222.2 84% 4.9%`).
- Use semantic CSS variable utilities (`bg-primary`, `text-foreground`, `border-border`).
- Use `cn()` from `src/lib/utils.ts` for all conditional class composition.
- Follow `.github/html-css-style-color-guide.instructions.md` for accessible colour usage.
- Component variants use `class-variance-authority` (CVA).

---

## Code Conventions

- **File naming:** PascalCase for components (`.tsx`), camelCase for utilities/hooks/services (`.ts`).
- **Path alias:** `@/` → `src/` everywhere (both Vite and tsconfig).
- **Exports:** Named exports for components; lazy-loaded via `.then(m => ({ default: m.X }))`.
- **Singletons:** `vaultManager` and `secureVault` are module-level singletons, not React context.
- **No secrets in localStorage:** DB config only. Credentials/passphrases live in DB (`secret_blob`) + memory.
- **SQL safety:** Dynamic identifiers must pass through `quoteIdentifier()` (`^[a-zA-Z_][a-zA-Z0-9_]*$`).
- **Dual vault config:** New format (`raw_dek + bcrypt_hash`) coexists with legacy (`wrapped_dek`). Use `isNewVaultConfig()` / `isLegacyVaultConfig()` type guards.
- **VaultEvent pattern:** `SecureVault` uses a `VaultEventListener[]` array for `locked`/`unlocked`/`auto-locked` events.
- **CSP:** Applied programmatically at startup via `initializeSecurity()` and server/Electron headers.
- **Banner comments:** All service/crypto/Electron files begin with a Pink Pixel branded comment block.
- **Backup files:** `.backup` files (e.g., `SelfHostedDashboard.tsx.backup`) are manual rollback snapshots — do not delete.

---

## Security Guidelines

- Never expose `ipcRenderer` directly — only the `contextBridge` surface (`window.keyperElectron`).
- Argon2id is the preferred KDF; PBKDF2 is the fallback — never intentionally downgrade.
- AES-256-GCM with a random IV per encryption operation — never reuse IVs.
- All SQL identifiers must be validated via `quoteIdentifier()` before use.
- CSP must restrict `script-src` to `'self'`; WASM needs the appropriate `wasm-unsafe-eval` directive.
- Follow OWASP Top 10 — especially injection, broken access control, and cryptographic failures.

---

## Documentation Maintenance

- Update `CHANGELOG.md` with every user-facing change (check current date first with a terminal command).
- Keep `OVERVIEW.md` accurate as the living technical reference.
- Instruction files live in `.github/` — update them when their domain changes.
