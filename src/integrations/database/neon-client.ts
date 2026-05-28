import { neon, neonConfig, NeonDbError, type NeonQueryFunction } from '@neondatabase/serverless';
import type { DbResponse } from '@/integrations/database/sqlite-client';

export type NeonMode = 'cloud' | 'local';

export interface NeonConnectionConfig {
  connectionString: string;
  mode: NeonMode;
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
type NeonQueryExecutor = (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

let activeConfig: NeonConnectionConfig | null = null;
let activeSql: NeonQueryFunction<false, false> | null = null;
let testQueryExecutor: NeonQueryExecutor | null = null;

function isSafeIdentifier(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

function quoteIdentifier(value: string): string {
  if (!isSafeIdentifier(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }

  return `"${value}"`;
}

function selectSql(columns = '*'): string {
  const normalized = columns.trim();
  if (!normalized || normalized === '*') return '*';
  if (normalized === 'count') return 'count';

  return normalized
    .split(',')
    .map((column) => quoteIdentifier(column.trim()))
    .join(', ');
}

function normalizePostgresValue(value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  return { ...row };
}

function buildWhereClause(filters: QueryFilter[] = [], startIndex = 1): { whereSql: string; params: unknown[]; nextIndex: number } {
  if (filters.length === 0) {
    return { whereSql: '', params: [], nextIndex: startIndex };
  }

  const clauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = startIndex;

  for (const filter of filters) {
    clauses.push(`${quoteIdentifier(filter.column)} = $${paramIndex}`);
    params.push(normalizePostgresValue(filter.value));
    paramIndex += 1;
  }

  return {
    whereSql: ` WHERE ${clauses.join(' AND ')}`,
    params,
    nextIndex: paramIndex,
  };
}

function upsertConflictColumns(table: string): string[] {
  if (table === 'vault_config') return ['user_id'];
  if (table === 'categories') return ['user_id', 'name'];
  return ['id'];
}

function mapError(error: unknown): { message: string; code?: string } {
  if (error instanceof NeonDbError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unknown Neon database error.' };
}

function localFetchEndpoint(connectionString: string): string {
  const parsed = new URL(connectionString);
  const host = parsed.hostname || 'localhost';
  const port = parsed.port || '5432';
  return `http://${host}:${port}/sql`;
}

function configureNeonRuntime(config: NeonConnectionConfig): void {
  if (config.mode === 'local') {
    neonConfig.fetchEndpoint = localFetchEndpoint(config.connectionString);
    neonConfig.useSecureWebSocket = false;
    neonConfig.poolQueryViaFetch = true;
    return;
  }

  neonConfig.fetchEndpoint = undefined;
  neonConfig.useSecureWebSocket = true;
  neonConfig.poolQueryViaFetch = false;
}

function getSql(): NeonQueryFunction<false, false> {
  if (!activeConfig?.connectionString) {
    throw new Error('Neon connection string is not configured.');
  }

  if (!activeSql) {
    configureNeonRuntime(activeConfig);
    activeSql = neon(activeConfig.connectionString, {
      disableWarningInBrowsers: true,
    });
  }

  return activeSql;
}

async function executeNeonQuery(query: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  if (testQueryExecutor) {
    return testQueryExecutor(query, params);
  }

  const rows = await getSql().query(query, params);
  return (rows as Record<string, unknown>[]).map(normalizeRow);
}

class NeonQueryBuilder {
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

  private async execute(): Promise<DbResponse> {
    try {
      const rows = await this.run();

      if (this.singleRow) {
        if (rows.length === 0) {
          return {
            data: null,
            error: { message: 'No rows found', code: 'PGRST116' },
          };
        }

        return { data: rows[0], error: null };
      }

      if ((this.selectedColumns === 'count' || this.countMode === 'exact') && this.action === 'select') {
        const count = Number(rows[0]?.count ?? 0);
        return {
          data: this.head ? null : rows,
          error: null,
          count,
        };
      }

      return { data: rows, error: null };
    } catch (error) {
      return {
        data: null,
        error: mapError(error),
      };
    }
  }

  private run(): Promise<Record<string, unknown>[]> {
    if (this.action === 'select') return this.runSelect();
    if (this.action === 'insert') return this.runInsert();
    if (this.action === 'update') return this.runUpdate();
    if (this.action === 'delete') return this.runDelete();
    if (this.action === 'upsert') return this.runUpsert();
    throw new Error(`Unsupported Neon action: ${this.action}`);
  }

  private runSelect(): Promise<Record<string, unknown>[]> {
    const table = quoteIdentifier(this.table);
    const isCountSelect = this.selectedColumns === 'count' || this.countMode === 'exact';
    const { whereSql, params } = buildWhereClause(this.filters);
    const orderSql = this.orderBy
      ? ` ORDER BY ${quoteIdentifier(this.orderBy.column)} ${this.orderBy.ascending ? 'ASC' : 'DESC'}`
      : '';
    const limitSql = this.rowLimit ? ` LIMIT ${Math.max(1, this.rowLimit)}` : '';
    const columns = isCountSelect ? 'COUNT(*)::int AS count' : selectSql(this.selectedColumns);

    return executeNeonQuery(`SELECT ${columns} FROM ${table}${whereSql}${orderSql}${limitSql}`, params);
  }

  private runInsert(): Promise<Record<string, unknown>[]> {
    if (!this.payloadValues) {
      throw new Error('insert requires values');
    }

    return this.insertRows(Array.isArray(this.payloadValues) ? this.payloadValues : [this.payloadValues]);
  }

  private runUpsert(): Promise<Record<string, unknown>[]> {
    if (!this.payloadValues) {
      throw new Error('upsert requires values');
    }

    const rows = Array.isArray(this.payloadValues) ? this.payloadValues : [this.payloadValues];
    if (rows.length === 0) return Promise.resolve([]);

    const keys = Object.keys(rows[0]);
    const table = quoteIdentifier(this.table);
    const columnsSql = keys.map(quoteIdentifier).join(', ');
    const valuesSql: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const row of rows) {
      valuesSql.push(`(${keys.map(() => `$${paramIndex++}`).join(', ')})`);
      params.push(...keys.map((key) => normalizePostgresValue(row[key])));
    }

    const conflictCols = upsertConflictColumns(this.table);
    const conflictSql = conflictCols.map(quoteIdentifier).join(', ');
    const updateCols = keys.filter((key) => !conflictCols.includes(key));
    const updateSql =
      updateCols.length > 0
        ? updateCols.map((key) => `${quoteIdentifier(key)} = EXCLUDED.${quoteIdentifier(key)}`).join(', ')
        : `${quoteIdentifier(conflictCols[0])} = EXCLUDED.${quoteIdentifier(conflictCols[0])}`;

    return executeNeonQuery(
      `INSERT INTO ${table} (${columnsSql}) VALUES ${valuesSql.join(', ')} ON CONFLICT (${conflictSql}) DO UPDATE SET ${updateSql} RETURNING *`,
      params,
    );
  }

  private insertRows(rows: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    if (rows.length === 0) return Promise.resolve([]);

    const keys = Object.keys(rows[0]);
    const table = quoteIdentifier(this.table);
    const columnsSql = keys.map(quoteIdentifier).join(', ');
    const valuesSql: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const row of rows) {
      valuesSql.push(`(${keys.map(() => `$${paramIndex++}`).join(', ')})`);
      params.push(...keys.map((key) => normalizePostgresValue(row[key])));
    }

    return executeNeonQuery(`INSERT INTO ${table} (${columnsSql}) VALUES ${valuesSql.join(', ')} RETURNING *`, params);
  }

  private runUpdate(): Promise<Record<string, unknown>[]> {
    if (!this.payloadValues || Array.isArray(this.payloadValues)) {
      throw new Error('update requires a single values object');
    }

    const updateValuesObject = this.payloadValues;
    const keys = Object.keys(updateValuesObject);
    if (keys.length === 0) return Promise.resolve([]);

    const table = quoteIdentifier(this.table);
    const params = keys.map((key) => normalizePostgresValue(updateValuesObject[key]));
    let paramIndex = params.length + 1;
    const setParts = keys.map((key, index) => `${quoteIdentifier(key)} = $${index + 1}`);

    if (!keys.includes('updated_at')) {
      setParts.push(`${quoteIdentifier('updated_at')} = $${paramIndex}`);
      params.push(new Date().toISOString());
      paramIndex += 1;
    }

    const { whereSql, params: whereParams } = buildWhereClause(this.filters, paramIndex);
    params.push(...whereParams);

    return executeNeonQuery(`UPDATE ${table} SET ${setParts.join(', ')}${whereSql} RETURNING *`, params);
  }

  private runDelete(): Promise<Record<string, unknown>[]> {
    const table = quoteIdentifier(this.table);
    const { whereSql, params } = buildWhereClause(this.filters);
    return executeNeonQuery(`DELETE FROM ${table}${whereSql} RETURNING *`, params);
  }
}

export const neonClient = {
  from(table: string): NeonQueryBuilder {
    return new NeonQueryBuilder(table);
  },
};

export function configureNeonProvider(config: NeonConnectionConfig | null): void {
  activeConfig = config?.connectionString ? config : null;
  activeSql = null;
}

export async function testNeonConnection(config: NeonConnectionConfig): Promise<DbResponse<{ mode: NeonMode }>> {
  try {
    configureNeonProvider(config);
    await executeNeonQuery('SELECT 1 AS ok');
    return {
      data: { mode: config.mode },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        ...mapError(error),
        code: mapError(error).code || 'NEON_TEST_FAILED',
      },
    };
  }
}

export function __setNeonQueryExecutorForTests(executor: NeonQueryExecutor | null): void {
  testQueryExecutor = executor;
}
