SQLite local-provider support is now implemented as a separate option, while keeping existing Supabase integration intact.

What I changed

Added provider-aware database client routing without changing your existing supabase.from(...) callsites.
client.ts (line 12)
Supports supabase or sqlite via keyper-db-provider.
Keeps Supabase credential flow as-is.
Adds SQLite provider init/test helpers and Electron detection.
Existing components/services still import supabase from the same path, so Supabase behavior remains isolated.
Added a SQLite query adapter in renderer that mimics the subset of Supabase query chaining you already use.
sqlite-client.ts (line 1)
Supports: .from().select().eq().order().limit().single(), .insert(), .update(), .delete(), .upsert().
Returns Supabase-like { data, error, count } objects.
Returns explicit “Electron-only” error outside desktop context.
Added Electron IPC bridge + SQLite engine in main process.
main.ts (line 62)
main.ts (line 247)
main.ts (line 507)
Uses better-sqlite3, opens DB file, auto-creates schema/tables/indexes.
Exposes IPC handlers:
keyper:sqlite:init
keyper:sqlite:test
keyper:sqlite:query
Exposed SQLite IPC safely through preload.
preload.ts (line 26)
Added typed renderer bridge declaration.
electron-bridge.d.ts (line 1)
Updated Settings UI to choose provider and show provider-specific setup instructions.
Settings.tsx (line 49)
Settings.tsx (line 652)
Adds provider selector: Supabase vs SQLite.
SQLite shows clear warning: local desktop only, not web/PWA.
SQLite “Test Connection” initializes local DB schema via Electron IPC.
Save flow persists provider + sqlite path + username.
Updated dashboard configured-state check to be provider-aware.
SelfHostedDashboard.tsx (line 3)
SelfHostedDashboard.tsx (line 107)
Added docs note for provider support and SQLite limitation.
README.md (line 247)
Added SQLite dependency.
package.json (line 95)
Validation run

npm install --no-audit --no-fund
npm run build
npm run electron:compile
npm run test:run
All passed.

Important behavior now

Supabase remains available and is still the default.
SQLite works only in Electron desktop mode.
In browser/PWA, selecting SQLite shows an unsupported warning and blocks connection/save for SQLite mode.
Next steps I recommend

Add a small migration/import tool (Supabase -> SQLite) so users can switch providers without manual export.
Add provider contract tests for core operations (credentials/categories/vault_config) so future DB providers can plug in safely.
Add explicit docs section with SQLite backup location and restore instructions.

7 files changed
+608
-62
Undo

README.md

-

*

main.ts

-

*

preload.ts

-

*

package.json

-

*

SelfHostedDashboard.tsx

-

*

Settings.tsx

-

*

client.ts

-

*

You’re out of Codex messages
Your rate limit resets on Mar 12, 2026, 1:32 AM. To continue using Codex, add credits or upgrade to Pro today.
Upgrade
