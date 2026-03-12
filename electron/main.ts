/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        🔐  Keyper  –  Electron Main Process                 ║
 * ║   Made with ❤️  by Pink Pixel  ✨  Dream it, Pixel it        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Architecture:
 *  • Production: serves the compiled Vite output (dist/) via a
 *    custom `app://` scheme so React Router's BrowserRouter works
 *    correctly (no file:// path confusion).
 *  • Development: loads the Vite dev server at http://localhost:4173
 *
 * Security posture:
 *  • nodeIntegration: false  – renderer never touches Node APIs
 *  • contextIsolation: true  – preload runs in isolated context
 *  • sandbox: false          – needed for WASM (argon2-browser)
 *  • All external navigation is intercepted and opened in the
 *    system browser rather than inside Electron.
 */

import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  shell,
  session,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

// ── Register the custom "app" scheme BEFORE app.ready ─────────────────────────
// This must happen synchronously before any async work.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,       // Behaves like http – relative URLs resolve correctly
      secure: true,         // Treated as a secure origin (enables crypto, etc.)
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// ── Environment detection ─────────────────────────────────────────────────────
// KEYPER_DEVTOOLS=1  → open DevTools automatically (set by electron:dev script)
// The app is *always* loaded from the compiled dist/ via app:// – the scripts
// run `npm run build` first, so there is never a need to point at a live
// Vite dev server. If you want true HMR, run `npm run dev` and then point
// Electron at http://localhost:4173 manually via electron:live below.
const openDevTools = process.env.KEYPER_DEVTOOLS === '1';

// ── Window dimensions ─────────────────────────────────────────────────────────
const WIN_WIDTH = 1300;
const WIN_HEIGHT = 840;
const WIN_MIN_WIDTH = 960;
const WIN_MIN_HEIGHT = 640;

type SqliteAction = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

interface SqliteQueryPayload {
  table: string;
  action: SqliteAction;
  select?: string;
  filters?: Array<{ column: string; value: unknown }>;
  order?: { column: string; ascending: boolean };
  limit?: number;
  values?: Record<string, unknown> | Record<string, unknown>[];
  single?: boolean;
  head?: boolean;
  count?: 'exact';
}

type SqliteResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number | null;
};

let sqliteDb: any = null;
let sqliteDbPath: string | null = null;
const DEFAULT_CATEGORY_USER_ID = 'self-hosted-user';
const DEFAULT_CATEGORIES = [
  ['Development', '#3b82f6', 'code', 'Development tools and APIs'],
  ['Personal', '#10b981', 'user', 'Personal accounts and services'],
  ['Work', '#f59e0b', 'briefcase', 'Work-related credentials'],
  ['Social Media', '#ec4899', 'users', 'Social media accounts'],
  ['Finance', '#06b6d4', 'credit-card', 'Banking and financial services'],
  ['Cloud Services', '#8b5cf6', 'cloud', 'Cloud platforms and services'],
  ['Security', '#ef4444', 'shield', 'Security tools and certificates'],
] as const;

function getBetterSqlite3(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('better-sqlite3');
  } catch (error) {
    const originalMessage = error instanceof Error ? error.message : String(error);

    if (originalMessage.includes('NODE_MODULE_VERSION')) {
      throw new Error(
        'Keyper could not load its bundled SQLite engine because this build contains a native module compiled for the wrong runtime. ' +
        'This is a packaging problem in the app build, not the end user\'s installed Node.js version. ' +
        'Please rebuild the app after running "npm run electron:sync-native".'
      );
    }

    throw error;
  }
}

function getDefaultSqlitePath(): string {
  return path.join(app.getPath('userData'), 'keyper.sqlite');
}

function isSafeIdentifier(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

function quoteIdentifier(value: string): string {
  if (!isSafeIdentifier(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function normalizeSqliteValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return value;
}

function maybeParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const mapped = { ...row };
  if (table === 'credentials') {
    mapped.tags = maybeParseJson(mapped.tags);
    mapped.secret_blob = maybeParseJson(mapped.secret_blob);
  }
  if (table === 'vault_config') {
    mapped.wrapped_dek = maybeParseJson(mapped.wrapped_dek);
  }
  return mapped;
}

function ensureSqliteSchema(db: any): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL DEFAULT 'self-hosted-user',
      title TEXT NOT NULL,
      description TEXT,
      credential_type TEXT NOT NULL DEFAULT 'secret',
      priority TEXT NOT NULL DEFAULT 'medium',
      username TEXT,
      url TEXT,
      tags TEXT DEFAULT '[]',
      category TEXT,
      notes TEXT,
      expires_at TEXT,
      last_accessed TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      secret_blob TEXT,
      encrypted_at TEXT,
      password TEXT,
      api_key TEXT,
      secret_value TEXT,
      token_value TEXT,
      certificate_data TEXT,
      misc_value TEXT,
      document_name TEXT,
      document_mime_type TEXT,
      document_content_base64 TEXT,
      document_size_bytes INTEGER
    );

    CREATE TABLE IF NOT EXISTS vault_config (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL UNIQUE DEFAULT 'self-hosted-user',
      wrapped_dek TEXT,
      raw_dek TEXT,
      bcrypt_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL DEFAULT 'self-hosted-user',
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'folder',
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(user_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_credentials_updated_at ON credentials(updated_at);
    CREATE INDEX IF NOT EXISTS idx_vault_config_user_id ON vault_config(user_id);
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
  `);

  const existingDefaultCount = db
    .prepare('SELECT COUNT(*) AS count FROM categories WHERE user_id = ?')
    .get(DEFAULT_CATEGORY_USER_ID) as { count?: number };

  if (Number(existingDefaultCount?.count ?? 0) > 0) {
    return;
  }

  const insertDefaultCategory = db.prepare(`
    INSERT INTO categories (user_id, name, color, icon, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((categories: typeof DEFAULT_CATEGORIES) => {
    for (const [name, color, icon, description] of categories) {
      insertDefaultCategory.run(DEFAULT_CATEGORY_USER_ID, name, color, icon, description);
    }
  });

  insertMany(DEFAULT_CATEGORIES);
}

function openSqliteDatabase(requestedPath?: string): { db: any; path: string } {
  const dbPath = (requestedPath || '').trim() || getDefaultSqlitePath();
  const normalizedPath = path.resolve(dbPath);

  if (sqliteDb && sqliteDbPath === normalizedPath) {
    return { db: sqliteDb, path: normalizedPath };
  }

  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    sqliteDbPath = null;
  }

  fs.mkdirSync(path.dirname(normalizedPath), { recursive: true });
  const BetterSqlite3 = getBetterSqlite3();
  const db = new BetterSqlite3(normalizedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  ensureSqliteSchema(db);

  sqliteDb = db;
  sqliteDbPath = normalizedPath;
  return { db, path: normalizedPath };
}

function buildWhereClause(filters: Array<{ column: string; value: unknown }> = []): { whereSql: string; params: unknown[] } {
  if (filters.length === 0) {
    return { whereSql: '', params: [] };
  }
  const clauses: string[] = [];
  const params: unknown[] = [];
  for (const filter of filters) {
    clauses.push(`${quoteIdentifier(filter.column)} = ?`);
    params.push(normalizeSqliteValue(filter.value));
  }
  return {
    whereSql: ` WHERE ${clauses.join(' AND ')}`,
    params,
  };
}

function upsertConflictColumns(table: string): string[] {
  if (table === 'vault_config') return ['user_id'];
  if (table === 'categories') return ['user_id', 'name'];
  return ['id'];
}

function runSqliteQuery(payload: SqliteQueryPayload): SqliteResult {
  const { db } = openSqliteDatabase();
  const table = quoteIdentifier(payload.table);
  const action = payload.action;
  const filters = payload.filters || [];
  const single = Boolean(payload.single);

  if (action === 'select') {
    const isCountSelect = payload.select === 'count' || payload.count === 'exact';
    const { whereSql, params } = buildWhereClause(filters);
    const orderSql = payload.order
      ? ` ORDER BY ${quoteIdentifier(payload.order.column)} ${payload.order.ascending ? 'ASC' : 'DESC'}`
      : '';
    const limitSql = payload.limit ? ` LIMIT ${Math.max(1, payload.limit)}` : '';

    if (isCountSelect) {
      const countRow = db.prepare(`SELECT COUNT(*) AS count FROM ${table}${whereSql}`).get(...params) as { count: number };
      return {
        data: payload.head ? null : [{ count: countRow.count }],
        error: null,
        count: countRow.count,
      };
    }

    const selectSql = `SELECT * FROM ${table}${whereSql}${orderSql}${limitSql}`;
    const rows = (db.prepare(selectSql).all(...params) as Record<string, unknown>[]).map((row) =>
      mapRow(payload.table, row),
    );

    if (single) {
      if (rows.length === 0) {
        return {
          data: null,
          error: { message: 'No rows found', code: 'PGRST116' },
        };
      }
      return { data: rows[0], error: null };
    }

    return { data: rows, error: null };
  }

  if (action === 'insert' || action === 'upsert') {
    if (!payload.values) {
      throw new Error(`${action} requires values`);
    }
    const rows = Array.isArray(payload.values) ? payload.values : [payload.values];
    const inserted: Record<string, unknown>[] = [];

    const insertMany = db.transaction((items: Record<string, unknown>[]) => {
      for (const row of items) {
        const keys = Object.keys(row);
        if (keys.length === 0) continue;
        const columnsSql = keys.map(quoteIdentifier).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map((key) => normalizeSqliteValue(row[key]));

        if (action === 'insert') {
          const sql = `INSERT INTO ${table} (${columnsSql}) VALUES (${placeholders}) RETURNING *`;
          const insertedRow = db.prepare(sql).get(...values) as Record<string, unknown>;
          inserted.push(mapRow(payload.table, insertedRow));
          continue;
        }

        const conflictCols = upsertConflictColumns(payload.table);
        const conflictSql = conflictCols.map(quoteIdentifier).join(', ');
        const updateCols = keys.filter((key) => !conflictCols.includes(key));
        const updateSql =
          updateCols.length > 0
            ? updateCols.map((key) => `${quoteIdentifier(key)} = excluded.${quoteIdentifier(key)}`).join(', ')
            : `${quoteIdentifier(conflictCols[0])} = excluded.${quoteIdentifier(conflictCols[0])}`;

        const sql = `INSERT INTO ${table} (${columnsSql}) VALUES (${placeholders}) ON CONFLICT(${conflictSql}) DO UPDATE SET ${updateSql} RETURNING *`;
        const upsertedRow = db.prepare(sql).get(...values) as Record<string, unknown>;
        inserted.push(mapRow(payload.table, upsertedRow));
      }
    });

    insertMany(rows);

    if (single) {
      if (inserted.length === 0) {
        return {
          data: null,
          error: { message: 'No rows found', code: 'PGRST116' },
        };
      }
      return { data: inserted[0], error: null };
    }
    return { data: inserted, error: null };
  }

  if (action === 'update') {
    if (!payload.values || Array.isArray(payload.values)) {
      throw new Error('update requires a single values object');
    }
    const updateValuesObject = payload.values as Record<string, unknown>;
    const keys = Object.keys(updateValuesObject);
    if (keys.length === 0) {
      return { data: [], error: null };
    }
    const setSql = keys.map((key) => `${quoteIdentifier(key)} = ?`).join(', ');
    const setValues = keys.map((key) => normalizeSqliteValue(updateValuesObject[key]));
    const { whereSql, params } = buildWhereClause(filters);
    const sql = `UPDATE ${table} SET ${setSql}, updated_at = ?${whereSql} RETURNING *`;
    const rows = (db.prepare(sql).all(...setValues, nowIsoString(), ...params) as Record<string, unknown>[]).map((row) =>
      mapRow(payload.table, row),
    );

    if (single) {
      if (rows.length === 0) {
        return {
          data: null,
          error: { message: 'No rows found', code: 'PGRST116' },
        };
      }
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }

  if (action === 'delete') {
    const { whereSql, params } = buildWhereClause(filters);
    const rows = (db.prepare(`DELETE FROM ${table}${whereSql} RETURNING *`).all(...params) as Record<string, unknown>[]).map(
      (row) => mapRow(payload.table, row),
    );

    if (single) {
      if (rows.length === 0) {
        return {
          data: null,
          error: { message: 'No rows found', code: 'PGRST116' },
        };
      }
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }

  throw new Error(`Unsupported SQLite action: ${action}`);
}

// ── Window factory ────────────────────────────────────────────────────────────
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: 'Keyper',
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    minWidth: WIN_MIN_WIDTH,
    minHeight: WIN_MIN_HEIGHT,
    // Dark background matching the app's slate-950 theme – prevents white flash
    backgroundColor: '#0F172A',
    show: false, // render fully, THEN show (no blank-window flash)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: false is required because argon2-browser uses SharedArrayBuffer
      // and WASM, which need access to certain low-level browser primitives.
      sandbox: false,
      webSecurity: true,
    },
    // Native title bar on Windows/Linux; traffic-light controls on macOS
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: process.platform !== 'darwin',
    // Use the project's icon as the window / taskbar icon
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
  });

  // ── Window events ───────────────────────────────────────────────────────────

  // Show only after the renderer has painted its first frame
  win.once('ready-to-show', () => {
    win.show();
    if (openDevTools) win.webContents.openDevTools();
  });

  // Open target="_blank" links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url).catch(console.error);
    }
    return { action: 'deny' };
  });

  // Prevent in-page navigation away from our app:// origin to external URLs
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!navigationUrl.startsWith('app://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl).catch(console.error);
    }
  });

  // ── Load the app ────────────────────────────────────────────────────────────
  // Always serve from the compiled dist/ via the custom app:// protocol.
  // Load app://bundle/ (root path) so window.location.pathname === '/'
  // and React Router's <Route path="/"> matches correctly.
  // If we loaded app://./index.html, pathname would be "/index.html" and
  // React Router would fall through to the 404 wildcard route.
  win.loadURL('app://bundle/');

  return win;
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // ── Custom protocol handler ─────────────────────────────────────────────────
  // Intercepts all `app://` requests and maps them to files inside dist/.
  // Any path that doesn't match a real file falls back to index.html so that
  // React Router can handle client-side navigation.
  protocol.handle('app', async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);

    // Normalise the path: "app://./index.html" → "index.html"
    const relFile =
      pathname === '/' || pathname === '' ? 'index.html' : pathname.replace(/^\//, '');

    const distDir = path.join(__dirname, '..', 'dist');
    const fullPath = path.join(distDir, relFile);

    try {
      const fileUrl = pathToFileURL(fullPath).toString();
      const response = await net.fetch(fileUrl);

      // Electron doesn't automatically set application/wasm for .wasm files
      // when served via file://, so we patch it here.
      if (fullPath.endsWith('.wasm')) {
        const headers = new Headers(response.headers);
        headers.set('Content-Type', 'application/wasm');
        return new Response(response.body, {
          status: response.status,
          headers,
        });
      }

      return response;
    } catch {
      // File not found → serve index.html for SPA client-side routing
      const indexUrl = pathToFileURL(path.join(distDir, 'index.html')).toString();
      return net.fetch(indexUrl);
    }
  });

  // Set Cross-Origin headers required by SharedArrayBuffer (used by argon2-browser)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    });
  });

  ipcMain.handle('keyper:sqlite:init', async (_event, payload?: { path?: string }) => {
    try {
      const opened = openSqliteDatabase(payload?.path);
      return { ok: true, path: opened.path };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize SQLite database';
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('keyper:sqlite:test', async (_event, payload?: { path?: string }) => {
    try {
      const opened = openSqliteDatabase(payload?.path);
      opened.db.prepare('SELECT 1 AS ok').get();
      return { ok: true, path: opened.path };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect to SQLite database';
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('keyper:sqlite:query', async (_event, payload: SqliteQueryPayload) => {
    try {
      return runSqliteQuery(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SQLite query failed';
      return {
        data: null,
        error: { message, code: 'SQLITE_QUERY_FAILED' },
      };
    }
  });

  createWindow();

  // macOS: re-create the window when the dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed (standard on Windows / Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
