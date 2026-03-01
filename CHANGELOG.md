# 📝 Changelog

All notable changes to Keyper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-01 - 🐳 **Docker Build & ⚡ Electron Desktop App**

### 🐳 **Docker Support**

- **Added** `Dockerfile` – optimised multi-stage build (Node 22 Alpine builder → nginx 1.27 Alpine server)
  - Stage 1 compiles the Vite/React app; Stage 2 serves only the static output → lean final image
  - WASM MIME type (`application/wasm`) patched so **argon2-browser** works inside the container
  - `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers added to satisfy **SharedArrayBuffer** requirements
- **Added** `nginx.conf` – production-hardened nginx server block
  - SPA fallback routing (`try_files ... /index.html`) for React Router
  - Gzip compression for JS/CSS/WASM/SVG/fonts
  - Long-lived cache headers (`Cache-Control: public, immutable`) for hashed assets
  - Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`
  - `/healthz` endpoint for container health checks
- **Added** `docker-compose.yml` – single-command stack launch with configurable `HOST_PORT` (default `8080`)
  - Built-in `healthcheck` using the nginx `/healthz` endpoint
  - Optional Caddy reverse-proxy snippet (commented out) for automatic HTTPS
- **Added** `.dockerignore` – excludes `node_modules/`, `dist/`, `electron/`, VCS files, secrets, and tooling to keep the build context lean

### ⚡ **Electron Desktop App**

- **Added** `electron/main.ts` – Electron main process
  - Custom `app://` protocol serves the compiled `dist/` bundle with full SPA routing support
  - WASM `Content-Type` patched for argon2-browser inside the Electron sandbox
  - `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` injected via `session.webRequest` headers
  - External link interception: all `https://` links open in the system browser via `shell.openExternal`
  - Security hardening: `contextIsolation: true`, `nodeIntegration: false`
  - macOS traffic-light title bar; auto-hiding menu bar on Windows/Linux
- **Added** `electron/preload.ts` – minimal context-bridge exposing `window.keyperElectron` to the renderer
  - `isElectron: true` flag for UI feature detection
  - `platform` and `version` fields
- **Added** `electron/tsconfig.json` – TypeScript config targeting CommonJS (required for Electron main process)
- **Added** electron scripts to `package.json`:
  - `electron:compile` – compiles `electron/*.ts` → `electron-dist/*.js`
  - `electron:preview` – build + compile + launch locally
  - `electron:dev` – same but opens DevTools
  - `electron:build` – full cross-platform distributables via electron-builder
  - `electron:build:linux` / `electron:build:win` / `electron:build:mac` – platform-specific builds
- **Added** `electron-builder.yml` – electron-builder configuration
  - Linux: AppImage (x64/arm64), deb (x64/arm64)
  - macOS: DMG + zip (Universal / Intel + Apple Silicon)
- **Added** `electron` `^33.3.0` and `electron-builder` `^25.1.8` to devDependencies

### 🌐 **Website & Downloads**

- **Added** direct download links for Linux desktop installers (AppImage, deb x86_64, deb ARM64) hosted on Cloudflare R2 via the [Keyper docs site](https://keyper.pinkpixel.dev/getting-started/install-and-run/)

### 🔧 **Housekeeping**

- **Updated** `.gitignore` – added `dist-electron/` and `electron-dist/` output directories

---

## [1.0.9] - 2026-03-01 - 🐛 **Bug Fixes: Multi-Session Credential Saving & Edit Modal**

### 🐛 **Bug Fixes**

- **Fixed** Critical error "can't access property 'trim', t.token_value is undefined" when adding a second credential in the same session
  - **Root Cause**: `resetForm()` in `AddCredentialModal` was missing `token_value` and `certificate_data` fields, leaving them as `undefined` after the first save
  - **Fix**: Added the two missing fields back to `resetForm()` so all state is properly cleared between submissions

- **Fixed** Critical error "could not find the 'api_key' column of 'credentials' in the schema cache" when editing a credential
  - **Root Cause**: `EditCredentialModal.handleSubmit()` was spreading the entire `formData` object directly into the Supabase `.update()` call, including legacy column names (`api_key`, `password`, `secret_value`, etc.) that do not exist in the current schema — all sensitive data lives in `secret_blob`
  - **Fix**: Rewrote the submit handler to build an explicit update object with only valid DB columns, and properly encrypt sensitive data into `secret_blob` using the vault

- **Improved** `EditCredentialModal` now correctly decrypts existing `secret_blob` data when the edit form opens, so current secret values are pre-populated and editable
- **Improved** `EditCredentialModal` now properly handles all five credential types with their correct sensitive field names: `password` (login), `api_key` (api_key), `secret_value` (secret), `token_value` (token), `certificate_data` (certificate) — previously `token` was incorrectly sharing the `secret_value` field and `certificate` type had no dedicated input

### ✨ **New Features**

- **Added** "No expiration" checkbox next to the **Expires At** date field in `AddCredentialModal`
  - Checking it clears any selected date and disables the date picker (visually greyed out)
  - Unchecking re-enables the date picker for normal use
  - Resets automatically when the form is cleared after a save

### 🏷️ **UX / Labels**

- **Updated** Supabase API key field label from `"Supabase Anon Key"` to `"Supabase Anon or Publishable Key"` to reflect Supabase's updated naming convention (both key types remain fully supported)
  - Updated in: Settings configuration screen, SQL setup script comment, and database setup wizard description

---

## [1.0.8] - 2025-08-28 - 🎨 **CLI Enhancement: Beautiful ASCII Banner & Deprecation Fix**

### 🎨 **CLI Visual Improvements**

- **Added** Stunning gradient KEYPER ASCII art banner for professional startup experience
  - **Beautiful Typography**: Large block-letter KEYPER logo in gradient cyan/blue colors
  - **Brand Colors**: Matching cyan/blue gradient that complements the app's glassmorphism UI theme
  - **Clean Layout**: Removed cluttered box borders for modern, minimal aesthetic
  - **Professional Branding**: Enhanced Pink Pixel branding with "Dream it, Pixel it" tagline

### 🔧 **Security & Compatibility Fixes**

- **Fixed** Node.js deprecation warning (DEP0190) for enhanced security
  - **Eliminated** Insecure `shell: true` + arguments array combination
  - **Implemented** Cross-platform spawn solution for Windows/Unix systems
  - **Enhanced** Security by preventing argument injection vulnerabilities
  - **Improved** Command execution reliability across all platforms

### 🚀 **Technical Enhancements**

- **Added** Platform detection for optimal command execution strategy:
  - **Windows**: Uses properly escaped command string with `shell: true`
  - **Unix/Linux/Mac**: Uses secure argument array with `shell: false`
- **Enhanced** Error handling and process management
- **Maintained** Full backward compatibility with existing CLI functionality
- **Improved** Developer experience with clean, warning-free startup

### 🌈 **User Experience**

- **Enhanced** Visual brand consistency between CLI and web application
- **Removed** Annoying deprecation warnings during server startup
- **Improved** Professional appearance for enterprise deployments
- **Maintained** All existing CLI functionality and features

### 🛡️ **Security Benefits**

- **Eliminated** Potential command injection attack vectors
- **Enhanced** Cross-platform security posture
- **Improved** Node.js compliance with latest security recommendations
- **Maintained** Zero-trust architecture principles

---

## [1.0.6] - 2025-08-28 - 🔧 **Critical Fix: Local Supabase Instance Support**

### 🚨 **Major: Local Database Connection Support**

- **Fixed** Critical issue preventing local Supabase instances from connecting
  - **Removed** Overly restrictive URL validation in `createTestSupabaseClient`
  - **Enhanced** Connection logic to accept any valid HTTP/HTTPS URL
  - **Added** Comprehensive support for localhost, IP addresses, and custom domains
  - **Improved** Error messages and debugging information for connection issues

### 🌐 **Universal Database Compatibility**

- **Added** Support for all local and self-hosted Supabase deployments:
  - ✅ **Localhost**: `http://localhost:54321`, `https://localhost:8443`
  - ✅ **IP Addresses**: `http://192.168.1.100:8000`, `http://127.0.0.1:54321`
  - ✅ **Private Networks**: `http://10.0.0.5:54321`, `http://172.17.0.1:8000`
  - ✅ **Docker Networks**: Complete support for all Docker IP ranges (172.16-31.\*)
  - ✅ **Custom Domains**: `https://supabase.mydomain.com`, `https://db.company.local`
  - ✅ **Supabase Cloud**: Existing `*.supabase.co` instances continue to work seamlessly

### 🛡️ **Smart Content Security Policy**

- **Enhanced** CSP configuration with intelligent environment detection:
  - **Development**: Fully permissive for maximum flexibility during development
  - **Self-hosted**: Balanced security with custom domain support for production
  - **Cloud**: Optimized security for Supabase Cloud deployments
- **Added** Dynamic CSP selection based on configured database credentials
- **Improved** Network support for all private IP ranges and custom domains

### 🔧 **Architecture Improvements**

- **Added** `hasCustomSupabaseCredentials()` helper function for clean configuration detection
- **Enhanced** Connection validation with informational logging instead of blocking
- **Improved** Error handling and debugging information throughout connection flow
- **Refactored** Hardcoded configuration checks to use proper helper functions

### 🏗️ **Technical Enhancements**

- **Modified** `src/integrations/supabase/client.ts`:
  - Removed restrictive hostname validation that blocked valid URLs
  - Added comprehensive IP range support for private networks
  - Enhanced logging for better debugging experience
- **Updated** `src/components/SelfHostedDashboard.tsx`:
  - Replaced hardcoded string comparisons with helper functions
  - Improved configuration state detection
- **Enhanced** `src/security/ContentSecurityPolicy.ts`:
  - Added three-tier CSP system (Development, Self-hosted, Production)
  - Comprehensive network range support for all deployment scenarios
  - Dynamic policy selection based on configuration

### ✅ **Connection Support Matrix**

| Instance Type                            | Before v1.0.6  | After v1.0.6 |
| ---------------------------------------- | -------------- | ------------ |
| Supabase Cloud (`*.supabase.co`)         | ✅ Working     | ✅ Working   |
| Localhost (`http://localhost:*`)         | ❌ **Blocked** | ✅ **FIXED** |
| Local IP (`http://192.168.1.100:*`)      | ❌ **Blocked** | ✅ **FIXED** |
| Custom Domain (`https://db.company.com`) | ❌ **Blocked** | ✅ **FIXED** |
| Docker Network (`http://172.17.*:*`)     | ❌ **Blocked** | ✅ **FIXED** |

### 🛡️ **Security & Compatibility**

- ✅ **Backward Compatible**: All existing Supabase Cloud setups continue working unchanged
- ✅ **Security Maintained**: Enhanced CSP policies maintain strong security posture
- ✅ **No Breaking Changes**: Seamless upgrade path with zero configuration changes required
- ✅ **Enhanced Debugging**: Better error messages and connection diagnostics

### 📚 **Documentation**

- **Added** `SUPABASE_FIXES.md` - Comprehensive documentation of all fixes applied
- **Updated** Connection troubleshooting guides with new supported formats
- **Enhanced** Self-hosting instructions with local instance setup examples

### 🎯 **User Impact**

- **Resolved** Connection failures for local Supabase instances
- **Eliminated** "URL does not appear to be a Supabase instance" errors
- **Enabled** Full self-hosting flexibility with any domain or IP configuration
- **Improved** Developer experience with better error messages and debugging

---

## [1.0.4] - 2025-08-23 - 🔐 **Major Security Overhaul: Simplified bcrypt-Only Passphrase System**

### 🚨 **Revolutionary Passphrase Reset System**

- **Added** Simplified bcrypt-only master passphrase authentication
  - **Eliminated** complex Argon2/AES key derivation for passphrase validation
  - **Implemented** direct bcrypt hash verification for instant authentication
  - **Removed** all backdoors, admin overrides, and security vulnerabilities
  - **Created** user-controlled passphrase reset via direct database access
  - **Enhanced** Security through elimination of attack vectors

### 🔓 **User-Controlled Emergency Reset**

- **Added** `docs/EMERGENCY_PASSPHRASE_RESET.md` - Comprehensive reset guide
  - **Instructions** for bcrypt hash generation using online tools
  - **Step-by-step** database update procedure via Supabase dashboard
  - **Security explanations** why this approach is safe and user-controlled
  - **Troubleshooting** section for common reset issues

### 🏗️ **Architecture Transformation**

- **Simplified** Vault encryption system:
  - **New Users**: `raw_dek` (base64) + `bcrypt_hash` storage
  - **Legacy Users**: Continue using existing `wrapped_dek` system (backwards compatible)
  - **Dual Support**: Automatic detection and handling of both vault formats
  - **Migration Path**: Optional upgrade path for existing users

### 🛡️ **Enhanced Security Model**

- **Removed** Emergency access systems and backdoors:
  - **Deleted** `src/security/HatchGate.ts` - Eliminated backdoor access
  - **Removed** `src/components/ResetKeyper.tsx` - No admin reset capability
  - **Cleaned** All references to emergency admin access
  - **Updated** Documentation to reflect new security-first approach

### 🔧 **Technical Improvements**

- **Created** `src/crypto/bcrypt.ts` - Secure bcrypt utility functions
- **Enhanced** `src/services/VaultStorage.ts` - Dual format support
- **Updated** `src/services/VaultManager.ts` - Smart vault type detection
- **Simplified** `src/services/SecureVault.ts` - Maintains legacy compatibility
- **Improved** Type definitions with legacy/new vault config types

### 🗄️ **Database Schema Evolution**

- **Updated** `supabase-setup.sql` and `src/components/Settings.tsx`:
  - **Added** `raw_dek TEXT` column (nullable for backwards compatibility)
  - **Enhanced** `bcrypt_hash TEXT` column for new passphrase system
  - **Maintained** `wrapped_dek JSONB` for existing users
  - **Secured** All PostgreSQL functions with proper `SECURITY DEFINER` settings

### 📋 **Migration Support**

- **Created** `migration-bcrypt.sql` - Database migration script
  - **Adds** new columns to existing vault_config table
  - **Provides** detailed migration instructions for existing users
  - **Maintains** full backwards compatibility
  - **Guides** users through optional upgrade process

### ✨ **User Experience**

- **New Users**: Automatic bcrypt-only system with instant reset capability
- **Existing Users**: No changes required, everything continues working
- **Reset Process**: Simple 4-step process using any bcrypt generator website
- **No Downtime**: Seamless deployment with zero breaking changes

### 🎯 **Security Benefits**

- **Eliminated** All potential backdoors and admin overrides
- **Simplified** Attack surface by removing complex key derivation chains
- **Enhanced** User control - only database owner can reset passphrases
- **Maintained** Strong AES-256-GCM encryption for actual credential data
- **Preserved** Zero-knowledge architecture principles

### 📚 **Documentation Updates**

- **Removed** All emergency access and backdoor documentation
- **Added** User-controlled passphrase reset instructions
- **Updated** Security model documentation throughout project
- **Enhanced** Setup instructions with new migration procedures

---

## [1.0.3] - 2025-08-23 - 🔒 **Security Enhancement: PostgreSQL Function Hardening**

### 🔒 **Security Improvements**

- **Fixed** PostgreSQL function search_path security warnings (function_search_path_mutable)
  - **update_updated_at_column**: Added `SET search_path = ''` security parameter
  - **get_credential_stats**: Added `SET search_path = ''` + fully qualified schema references
  - **check_rls_status**: Added `SET search_path = ''` + fully qualified schema references
  - **Protection**: Prevents search path injection attacks and ensures consistent behavior
  - **Compliance**: Meets PostgreSQL security best practices and OWASP guidelines

### 🛡️ **Enhanced Database Security**

- **Added** `rls-security-fixes.sql` - Standalone security patch for existing databases
- **Updated** `supabase-setup.sql` - Main setup script now includes secure function definitions
- **Improved** All functions now use `SECURITY DEFINER` with empty search_path
- **Qualified** All database object references use explicit `schema.table` notation
- **Documented** Comprehensive security implementation details in updated files

### 🔧 **Technical Details**

- **Search Path Security**: All PostgreSQL functions now set `search_path = ''` to prevent path manipulation
- **Schema Qualification**: Database objects referenced with explicit `public.tablename` format
- **Consistent Context**: Functions execute with predictable, secure environment
- **Best Practices**: Aligned with PostgreSQL security recommendations and industry standards

### 📚 **Documentation Updates**

- **Updated** `RLS_FIXES_NEEDED.md` - Now shows resolved status with implementation details
- **Added** Security fix implementation guide with verification queries
- **Enhanced** Database setup instructions with security considerations

---

## [1.0.1] - 2025-08-16 - 🚨 **Emergency Troubleshooting System**

### 🚨 **Major: Panic Hatch System**

- **Added** Emergency diagnostic and reset system for stuck configurations
  - **HatchGate.ts**: Session-based temporary access control with short-lived session TTL
  - **ResetKeyper.tsx**: Comprehensive diagnostic page for troubleshooting
  - **Hidden Route**: Secure diagnostic route only accessible when armed
  - **Health Checks**: Database table verification and connection testing
  - **Config Reset**: Selective clearing of Keyper configuration keys
  - **Origin Reset**: Complete site data clearing for extreme cases

### 🛡️ **Enhanced Security**

- **Added** Obscurity-based emergency access without compromising authentication
- **Added** Session storage with automatic expiration for temporary access
- **Added** Optional admin marker requirement for additional protection
- **Added** Professional ops procedures with encryption recommendations
- **Security Note**: Emergency system uses security-by-obscurity, not authentication bypass
