import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

export interface DbError {
  message: string;
  code?: string;
}

export interface DbResponse<T = unknown> {
  data: T | null;
  error: DbError | null;
  count?: number | null;
}

interface QueryFilter {
  column: string;
  value: unknown;
}

interface QueryOrder {
  column: string;
  ascending: boolean;
}

type QueryAction = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

interface SqliteQueryPayload {
  table: string;
  action: QueryAction;
  select?: string;
  filters?: QueryFilter[];
  order?: QueryOrder;
  limit?: number;
  values?: Record<string, unknown> | Record<string, unknown>[];
  single?: boolean;
  head?: boolean;
  count?: 'exact';
}

interface SqliteBridge {
  init: (dbPath?: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  test: (dbPath?: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  query: (payload: SqliteQueryPayload) => Promise<DbResponse>;
}

interface SqlJsStatement {
  bind: (params?: Record<string, unknown> | unknown[]) => boolean;
  step: () => boolean;
  getAsObject: () => Record<string, unknown>;
  free: () => void;
}

interface SqlJsDatabase {
  run: (sql: string, params?: unknown[]) => void;
  prepare: (sql: string) => SqlJsStatement;
  export: () => Uint8Array;
  close?: () => void;
}

interface SqlJsModule {
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}

const BROWSER_SQLITE_STORAGE_DB = 'keyper-browser-sqlite';
const BROWSER_SQLITE_STORAGE_STORE = 'databases';
const BROWSER_SQLITE_STORAGE_KEY = 'keyper-browser-sqlite-fallback';
const DEFAULT_BROWSER_DATABASE_NAME = 'default';
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

let sqlJsModulePromise: Promise<SqlJsModule> | null = null;
let browserDatabaseState:
  | {
      key: string;
      db: SqlJsDatabase;
    }
  | null = null;
let browserQueryQueue: Promise<unknown> = Promise.resolve();

function getBridge(): SqliteBridge | null {
  if (typeof window === 'undefined') return null;
  return window.keyperElectron?.sqlite ?? null;
}

function canUseBrowserSqlite(): boolean {
  return typeof window !== 'undefined';
}

function getBrowserDatabaseKey(dbPath?: string): string {
  const trimmedPath = dbPath?.trim();
  return trimmedPath || DEFAULT_BROWSER_DATABASE_NAME;
}

function getBrowserDatabaseLabel(dbPath?: string): string {
  const trimmedPath = dbPath?.trim();
  return trimmedPath || DEFAULT_BROWSER_DATABASE_NAME;
}

function getActiveBrowserDatabasePath(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage.getItem('keyper-sqlite-db-path') || undefined;
}

function getSqlWasmPath(): string {
  if (typeof process !== 'undefined' && process.env.VITEST) {
    return `${process.cwd()}/node_modules/sql.js/dist/sql-wasm.wasm`;
  }

  return sqlWasmUrl;
}

async function getSqlJsModule(): Promise<SqlJsModule> {
  if (!sqlJsModulePromise) {
    sqlJsModulePromise = initSqlJs({
      locateFile: () => getSqlWasmPath(),
    }) as Promise<SqlJsModule>;
  }

  return sqlJsModulePromise;
}

function queueBrowserOperation<T>(operation: () => Promise<T>): Promise<T> {
  const run = browserQueryQueue.then(operation, operation);
  browserQueryQueue = run.catch(() => undefined);
  return run;
}

function ensureSqliteSchema(db: SqlJsDatabase): void {
  db.run(`
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

  // Seed shared default categories so every user can see them.
  const countResult = db.prepare('SELECT COUNT(*) AS count FROM categories WHERE user_id = ?');
  try {
    countResult.bind([DEFAULT_CATEGORY_USER_ID]);
    countResult.step();
    const count = Number(countResult.getAsObject().count ?? 0);
    if (count === 0) {
      const categoryPlaceholders = DEFAULT_CATEGORIES
        .map(() => '(?, ?, ?, ?, ?)')
        .join(',\n          ');
      const categoryValues = DEFAULT_CATEGORIES.flatMap(([name, color, icon, description]) => [
        DEFAULT_CATEGORY_USER_ID,
        name,
        color,
        icon,
        description,
      ]);
      const stmt = db.prepare(`
        INSERT INTO categories (user_id, name, color, icon, description) VALUES
          ${categoryPlaceholders};
      `);
      try {
        stmt.bind(categoryValues);
        stmt.step();
      } finally {
        stmt.free();
      }
    }
  } finally {
    countResult.free();
  }
}

function openBrowserStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(BROWSER_SQLITE_STORAGE_DB, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(BROWSER_SQLITE_STORAGE_STORE)) {
        database.createObjectStore(BROWSER_SQLITE_STORAGE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open browser SQLite storage.'));
  });
}

function toBase64(data: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < data.length; index += chunkSize) {
    const chunk = data.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function loadPersistedBrowserDatabase(key: string): Promise<Uint8Array | null> {
  if (!canUseBrowserSqlite()) {
    return null;
  }

  if (!window.indexedDB) {
    const fallbackValue = window.localStorage.getItem(`${BROWSER_SQLITE_STORAGE_KEY}:${key}`);
    return fallbackValue ? fromBase64(fallbackValue) : null;
  }

  const database = await openBrowserStorage();

  try {
    return await new Promise<Uint8Array | null>((resolve, reject) => {
      const transaction = database.transaction(BROWSER_SQLITE_STORAGE_STORE, 'readonly');
      const store = transaction.objectStore(BROWSER_SQLITE_STORAGE_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        if (result instanceof Uint8Array) {
          resolve(result);
          return;
        }

        if (result instanceof ArrayBuffer) {
          resolve(new Uint8Array(result));
          return;
        }

        if (ArrayBuffer.isView(result)) {
          resolve(new Uint8Array(result.buffer.slice(0)));
          return;
        }

        resolve(null);
      };

      request.onerror = () => reject(request.error ?? new Error('Failed to read browser SQLite database.'));
    });
  } finally {
    database.close();
  }
}

async function persistBrowserDatabase(key: string, db: SqlJsDatabase): Promise<void> {
  const exported = db.export();

  if (!window.indexedDB) {
    window.localStorage.setItem(`${BROWSER_SQLITE_STORAGE_KEY}:${key}`, toBase64(exported));
    return;
  }

  const database = await openBrowserStorage();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(BROWSER_SQLITE_STORAGE_STORE, 'readwrite');
      const store = transaction.objectStore(BROWSER_SQLITE_STORAGE_STORE);
      const request = store.put(exported, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to persist browser SQLite database.'));
    });
  } finally {
    database.close();
  }
}

async function getBrowserDatabase(dbPath?: string): Promise<{ db: SqlJsDatabase; key: string; label: string }> {
  const key = getBrowserDatabaseKey(dbPath);
  const label = getBrowserDatabaseLabel(dbPath);

  if (browserDatabaseState?.key === key) {
    return {
      db: browserDatabaseState.db,
      key,
      label,
    };
  }

  if (browserDatabaseState) {
    await persistBrowserDatabase(browserDatabaseState.key, browserDatabaseState.db);
    browserDatabaseState.db.close?.();
    browserDatabaseState = null;
  }

  const SQL = await getSqlJsModule();
  const existingDatabase = await loadPersistedBrowserDatabase(key);
  const db = existingDatabase ? new SQL.Database(existingDatabase) : new SQL.Database();

  ensureSqliteSchema(db);
  await persistBrowserDatabase(key, db);

  browserDatabaseState = {
    key,
    db,
  };

  return {
    db,
    key,
    label,
  };
}

function notAvailableError(): DbError {
  return {
    message: 'SQLite provider is unavailable in this environment.',
    code: 'SQLITE_NOT_AVAILABLE',
  };
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

function buildWhereClause(filters: QueryFilter[] = []): { whereSql: string; params: unknown[] } {
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

function executeRows(db: SqlJsDatabase, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const statement = db.prepare(sql);

  try {
    if (params.length > 0) {
      statement.bind(params);
    }

    const rows: Record<string, unknown>[] = [];

    while (statement.step()) {
      rows.push(statement.getAsObject());
    }

    return rows;
  } finally {
    statement.free();
  }
}

async function runBrowserSqliteQuery(payload: SqliteQueryPayload): Promise<DbResponse> {
  return queueBrowserOperation(async () => {
    const { db, key } = await getBrowserDatabase(getActiveBrowserDatabasePath());
    const table = quoteIdentifier(payload.table);
    const action = payload.action;
    const filters = payload.filters || [];
    const single = Boolean(payload.single);
    let shouldPersist = false;

    if (action === 'select') {
      const isCountSelect = payload.select === 'count' || payload.count === 'exact';
      const { whereSql, params } = buildWhereClause(filters);
      const orderSql = payload.order
        ? ` ORDER BY ${quoteIdentifier(payload.order.column)} ${payload.order.ascending ? 'ASC' : 'DESC'}`
        : '';
      const limitSql = payload.limit ? ` LIMIT ${Math.max(1, payload.limit)}` : '';

      if (isCountSelect) {
        const countRows = executeRows(db, `SELECT COUNT(*) AS count FROM ${table}${whereSql}`, params);
        const count = Number(countRows[0]?.count ?? 0);
        return {
          data: payload.head ? null : [{ count }],
          error: null,
          count,
        };
      }

      const selectColumns = payload.select && payload.select !== 'count' ? payload.select : '*';
      const rows = executeRows(db, `SELECT ${selectColumns} FROM ${table}${whereSql}${orderSql}${limitSql}`, params).map((row) =>
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

      shouldPersist = true;

      const rows = Array.isArray(payload.values) ? payload.values : [payload.values];
      const inserted: Record<string, unknown>[] = [];

      for (const row of rows) {
        const keys = Object.keys(row);
        if (keys.length === 0) continue;

        const columnsSql = keys.map(quoteIdentifier).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map((currentKey) => normalizeSqliteValue(row[currentKey]));

        if (action === 'insert') {
          const sql = `INSERT INTO ${table} (${columnsSql}) VALUES (${placeholders}) RETURNING *`;
          const insertedRow = executeRows(db, sql, values)[0];
          if (insertedRow) {
            inserted.push(mapRow(payload.table, insertedRow));
          }
          continue;
        }

        const conflictCols = upsertConflictColumns(payload.table);
        const conflictSql = conflictCols.map(quoteIdentifier).join(', ');
        const updateCols = keys.filter((currentKey) => !conflictCols.includes(currentKey));
        const updateSql =
          updateCols.length > 0
            ? updateCols
                .map((currentKey) => `${quoteIdentifier(currentKey)} = excluded.${quoteIdentifier(currentKey)}`)
                .join(', ')
            : `${quoteIdentifier(conflictCols[0])} = excluded.${quoteIdentifier(conflictCols[0])}`;
        const sql = `INSERT INTO ${table} (${columnsSql}) VALUES (${placeholders}) ON CONFLICT(${conflictSql}) DO UPDATE SET ${updateSql} RETURNING *`;
        const upsertedRow = executeRows(db, sql, values)[0];
        if (upsertedRow) {
          inserted.push(mapRow(payload.table, upsertedRow));
        }
      }

      if (shouldPersist) {
        await persistBrowserDatabase(key, db);
      }

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

      shouldPersist = true;

      const updateValuesObject = payload.values;
      const keys = Object.keys(updateValuesObject);
      if (keys.length === 0) {
        return { data: [], error: null };
      }

      const setSql = keys.map((currentKey) => `${quoteIdentifier(currentKey)} = ?`).join(', ');
      const setValues = keys.map((currentKey) => normalizeSqliteValue(updateValuesObject[currentKey]));
      const { whereSql, params } = buildWhereClause(filters);
      const sql = `UPDATE ${table} SET ${setSql}, updated_at = ?${whereSql} RETURNING *`;
      const rows = executeRows(db, sql, [...setValues, nowIsoString(), ...params]).map((row) => mapRow(payload.table, row));

      if (shouldPersist) {
        await persistBrowserDatabase(key, db);
      }

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
      shouldPersist = true;

      const { whereSql, params } = buildWhereClause(filters);
      const rows = executeRows(db, `DELETE FROM ${table}${whereSql} RETURNING *`, params).map((row) =>
        mapRow(payload.table, row),
      );

      if (shouldPersist) {
        await persistBrowserDatabase(key, db);
      }

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
  });
}

async function initializeBrowserSqliteDatabase(dbPath?: string): Promise<DbResponse<{ path?: string }>> {
  try {
    const { db, key, label } = await queueBrowserOperation(async () => getBrowserDatabase(dbPath));
    await persistBrowserDatabase(key, db);
    return {
      data: { path: label },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Failed to initialize browser SQLite database.',
        code: 'SQLITE_INIT_FAILED',
      },
    };
  }
}

async function testBrowserSqliteConnection(dbPath?: string): Promise<DbResponse<{ path?: string }>> {
  try {
    const { db, key, label } = await queueBrowserOperation(async () => getBrowserDatabase(dbPath));
    executeRows(db, 'SELECT 1 AS ok');
    await persistBrowserDatabase(key, db);
    return {
      data: { path: label },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Failed to connect to browser SQLite database.',
        code: 'SQLITE_TEST_FAILED',
      },
    };
  }
}

class SqliteQueryBuilder {
  private readonly table: string;
  private action: QueryAction = 'select';
  private selectedColumns = '*';
  private filters: QueryFilter[] = [];
  private orderBy?: QueryOrder;
  private rowLimit?: number;
  private payloadValues?: Record<string, unknown> | Record<string, unknown>[];
  private singleRow = false;
  private head = false;
  private countMode?: 'exact';

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }): this {
    // Only set action to 'select' if no mutation action has been set.
    // In Supabase, calling .select() after insert/update/upsert/delete
    // means "return the mutated rows", not "do a SELECT instead".
    if (this.action === 'select') {
      this.action = 'select';
    }
    this.selectedColumns = columns;
    this.head = Boolean(options?.head);
    this.countMode = options?.count;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = {
      column,
      ascending: options?.ascending !== false,
    };
    return this;
  }

  limit(limit: number): this {
    this.rowLimit = limit;
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.action = 'insert';
    this.payloadValues = values;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.action = 'update';
    this.payloadValues = values;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.action = 'upsert';
    this.payloadValues = values;
    return this;
  }

  single(): Promise<DbResponse> {
    this.singleRow = true;
    return this.execute();
  }

  then<TResult1 = DbResponse, TResult2 = never>(
    onfulfilled?: ((value: DbResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private execute(): Promise<DbResponse> {
    const bridge = getBridge();
    if (!bridge) {
      if (!canUseBrowserSqlite()) {
        return Promise.resolve({
          data: null,
          error: notAvailableError(),
        });
      }

      const queryPayload: SqliteQueryPayload = {
        table: this.table,
        action: this.action,
        select: this.selectedColumns,
        filters: this.filters,
        order: this.orderBy,
        limit: this.rowLimit,
        values: this.payloadValues,
        single: this.singleRow,
        head: this.head,
        count: this.countMode,
      };

      return runBrowserSqliteQuery(queryPayload);
    }

    const queryPayload: SqliteQueryPayload = {
      table: this.table,
      action: this.action,
      select: this.selectedColumns,
      filters: this.filters,
      order: this.orderBy,
      limit: this.rowLimit,
      values: this.payloadValues,
      single: this.singleRow,
      head: this.head,
      count: this.countMode,
    };

    return bridge.query(queryPayload);
  }
}

export const sqliteClient = {
  from(table: string): SqliteQueryBuilder {
    return new SqliteQueryBuilder(table);
  },
};

export async function testSqliteConnection(dbPath?: string): Promise<DbResponse<{ path?: string }>> {
  const bridge = getBridge();
  if (!bridge) {
    if (!canUseBrowserSqlite()) {
      return {
        data: null,
        error: notAvailableError(),
      };
    }

    return testBrowserSqliteConnection(dbPath);
  }

  const result = await bridge.test(dbPath);
  if (!result.ok) {
    return {
      data: null,
      error: {
        message: result.error || 'Failed to connect to SQLite database.',
        code: 'SQLITE_TEST_FAILED',
      },
    };
  }

  return {
    data: { path: result.path },
    error: null,
  };
}

export async function initializeSqliteDatabase(dbPath?: string): Promise<DbResponse<{ path?: string }>> {
  const bridge = getBridge();
  if (!bridge) {
    if (!canUseBrowserSqlite()) {
      return {
        data: null,
        error: notAvailableError(),
      };
    }

    return initializeBrowserSqliteDatabase(dbPath);
  }

  const result = await bridge.init(dbPath);
  if (!result.ok) {
    return {
      data: null,
      error: {
        message: result.error || 'Failed to initialize SQLite database.',
        code: 'SQLITE_INIT_FAILED',
      },
    };
  }

  return {
    data: { path: result.path },
    error: null,
  };
}
