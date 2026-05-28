import { beforeEach, describe, expect, it, vi } from 'vitest';

import { __setNeonQueryExecutorForTests } from '@/integrations/database/neon-client';
import {
  clearNeonCredentials,
  clearSqliteDatabasePath,
  clearSupabaseCredentials,
  DB_PROVIDER_KEY,
  getDatabaseProvider,
  getNeonConnectionString,
  getNeonMode,
  NEON_CONNECTION_STRING_KEY,
  NEON_MODE_KEY,
  refreshSupabaseClient,
  saveDatabaseProvider,
  saveNeonCredentials,
  saveSupabaseCredentials,
  SQLITE_DB_PATH_KEY,
  SUPABASE_KEY_KEY,
  SUPABASE_URL_KEY,
  supabase,
} from './client';

type MockStorage = Record<string, string>;

function installMemoryLocalStorage(): MockStorage {
  const storage: MockStorage = {};

  vi.mocked(localStorage.getItem).mockImplementation((key: string) => storage[key] ?? null);
  vi.mocked(localStorage.setItem).mockImplementation((key: string, value: string) => {
    storage[key] = value;
  });
  vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
    delete storage[key];
  });
  vi.mocked(localStorage.clear).mockImplementation(() => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
  });

  return storage;
}

describe('database provider routing', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    __setNeonQueryExecutorForTests(null);
  });

  it('recognizes and stores Neon provider configuration', () => {
    const saved = saveNeonCredentials('postgres://neon:npg@localhost:5432/neondb', 'local', 'alice');

    expect(saved).toBe(true);
    expect(getDatabaseProvider()).toBe('neon');
    expect(getNeonConnectionString()).toBe('postgres://neon:npg@localhost:5432/neondb');
    expect(getNeonMode()).toBe('local');
  });

  it('clears Neon configuration without clearing Supabase or SQLite settings', () => {
    localStorage.setItem(SQLITE_DB_PATH_KEY, 'local-db');
    saveSupabaseCredentials('https://project.supabase.co', 'anon-key', 'alice');
    saveNeonCredentials('postgres://neon:npg@localhost:5432/neondb', 'cloud', 'alice');

    clearNeonCredentials();

    expect(localStorage.getItem(NEON_CONNECTION_STRING_KEY)).toBeNull();
    expect(localStorage.getItem(NEON_MODE_KEY)).toBeNull();
    expect(localStorage.getItem(SUPABASE_URL_KEY)).toBe('https://project.supabase.co');
    expect(localStorage.getItem(SUPABASE_KEY_KEY)).toBe('anon-key');
    expect(localStorage.getItem(SQLITE_DB_PATH_KEY)).toBe('local-db');
  });

  it('routes supabase compatibility calls to Neon when Neon is active', async () => {
    const execute = vi.fn(async () => [{ user_id: 'alice' }]);
    __setNeonQueryExecutorForTests(execute);
    saveNeonCredentials('postgres://neon:npg@localhost:5432/neondb', 'local', 'alice');

    refreshSupabaseClient();

    const result = await supabase
      .from('vault_config')
      .select('user_id')
      .eq('user_id', 'alice');

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ user_id: 'alice' }]);
    expect(execute).toHaveBeenCalledWith('SELECT "user_id" FROM "vault_config" WHERE "user_id" = $1', ['alice']);
  });

  it('can switch between saved providers', () => {
    saveDatabaseProvider('sqlite');
    expect(getDatabaseProvider()).toBe('sqlite');

    saveNeonCredentials('postgres://neon:npg@localhost:5432/neondb', 'local');
    expect(getDatabaseProvider()).toBe('neon');

    saveSupabaseCredentials('https://project.supabase.co', 'anon-key');
    expect(getDatabaseProvider()).toBe('supabase');

    clearSupabaseCredentials();
    clearSqliteDatabasePath();
    clearNeonCredentials();
    localStorage.removeItem(DB_PROVIDER_KEY);
    expect(getDatabaseProvider()).toBe('supabase');
  });
});
