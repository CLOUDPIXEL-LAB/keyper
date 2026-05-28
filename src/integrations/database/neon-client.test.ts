import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  __setNeonQueryExecutorForTests,
  configureNeonProvider,
  neonClient,
  testNeonConnection,
} from './neon-client';

describe('neon query builder', () => {
  afterEach(() => {
    __setNeonQueryExecutorForTests(null);
    configureNeonProvider(null);
  });

  it('builds filtered ordered limited select queries', async () => {
    const execute = vi.fn(async () => [{ id: 'credential-1', title: 'Example' }]);
    __setNeonQueryExecutorForTests(execute);

    const result = await neonClient
      .from('credentials')
      .select('id, title')
      .eq('user_id', 'alice')
      .order('created_at', { ascending: false })
      .limit(5);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: 'credential-1', title: 'Example' }]);
    expect(execute).toHaveBeenCalledWith(
      'SELECT "id", "title" FROM "credentials" WHERE "user_id" = $1 ORDER BY "created_at" DESC LIMIT 5',
      ['alice'],
    );
  });

  it('returns exact counts and honors head mode', async () => {
    const execute = vi.fn(async () => [{ count: 7 }]);
    __setNeonQueryExecutorForTests(execute);

    const result = await neonClient
      .from('credentials')
      .select('count', { count: 'exact', head: true })
      .eq('user_id', 'alice');

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
    expect(result.count).toBe(7);
    expect(execute).toHaveBeenCalledWith('SELECT COUNT(*)::int AS count FROM "credentials" WHERE "user_id" = $1', ['alice']);
  });

  it('returns PGRST116-compatible errors for empty single results', async () => {
    __setNeonQueryExecutorForTests(async () => []);

    const result = await neonClient
      .from('vault_config')
      .select('*')
      .eq('user_id', 'missing-user')
      .single();

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'No rows found', code: 'PGRST116' });
  });

  it('builds insert queries and passes JSON and array values as parameters', async () => {
    const secretBlob = { v: 1, data: 'encrypted' };
    const execute = vi.fn(async () => [{ id: 'credential-1', secret_blob: secretBlob, tags: ['api', 'prod'] }]);
    __setNeonQueryExecutorForTests(execute);

    const result = await neonClient
      .from('credentials')
      .insert({
        user_id: 'alice',
        title: 'API',
        tags: ['api', 'prod'],
        secret_blob: secretBlob,
      })
      .select('*')
      .single();

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: 'credential-1', secret_blob: secretBlob, tags: ['api', 'prod'] });
    expect(execute).toHaveBeenCalledWith(
      'INSERT INTO "credentials" ("user_id", "title", "tags", "secret_blob") VALUES ($1, $2, $3, $4) RETURNING *',
      ['alice', 'API', ['api', 'prod'], secretBlob],
    );
  });

  it('builds update and delete queries', async () => {
    const execute = vi.fn(async () => [{ id: 'credential-1' }]);
    __setNeonQueryExecutorForTests(execute);

    await neonClient
      .from('credentials')
      .update({ title: 'Updated', updated_at: '2026-05-28T00:00:00.000Z' })
      .eq('id', 'credential-1');

    await neonClient
      .from('credentials')
      .delete()
      .eq('id', 'credential-1')
      .eq('user_id', 'alice');

    expect(execute).toHaveBeenNthCalledWith(
      1,
      'UPDATE "credentials" SET "title" = $1, "updated_at" = $2 WHERE "id" = $3 RETURNING *',
      ['Updated', '2026-05-28T00:00:00.000Z', 'credential-1'],
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      'DELETE FROM "credentials" WHERE "id" = $1 AND "user_id" = $2 RETURNING *',
      ['credential-1', 'alice'],
    );
  });

  it('uses provider-specific upsert conflict targets', async () => {
    const execute = vi.fn(async () => [{ ok: true }]);
    __setNeonQueryExecutorForTests(execute);

    await neonClient.from('vault_config').upsert({ user_id: 'alice', raw_dek: 'dek' });
    await neonClient.from('categories').upsert({ user_id: 'alice', name: 'Work', color: '#fff' });
    await neonClient.from('credentials').upsert({ id: 'credential-1', title: 'API' });

    expect(execute.mock.calls[0][0]).toContain('ON CONFLICT ("user_id") DO UPDATE');
    expect(execute.mock.calls[1][0]).toContain('ON CONFLICT ("user_id", "name") DO UPDATE');
    expect(execute.mock.calls[2][0]).toContain('ON CONFLICT ("id") DO UPDATE');
  });

  it('tests Neon connectivity through the configured executor', async () => {
    const execute = vi.fn(async () => [{ ok: 1 }]);
    __setNeonQueryExecutorForTests(execute);

    const result = await testNeonConnection({
      connectionString: 'postgres://neon:npg@localhost:5432/neondb',
      mode: 'local',
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ mode: 'local' });
    expect(execute).toHaveBeenCalledWith('SELECT 1 AS ok', []);
  });
});
