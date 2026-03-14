import { beforeEach, describe, expect, it } from 'vitest';
import { initializeSqliteDatabase, sqliteClient } from '@/integrations/database/sqlite-client';
import {
  DB_PROVIDER_KEY,
  SQLITE_DB_PATH_KEY,
  SUPABASE_USERNAME_KEY,
} from '@/integrations/supabase/client';
import { vaultManager } from '@/services/VaultManager';

function installInMemoryLocalStorage(): void {
  const store = new Map<string, string>();

  const storage = {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
  }
}

describe('multi-user flow with sqlite provider', () => {
  beforeEach(async () => {
    installInMemoryLocalStorage();

    const dbName = `multi-user-sqlite-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DB_PROVIDER_KEY, 'sqlite');
    localStorage.setItem(SQLITE_DB_PATH_KEY, dbName);
    localStorage.setItem(SUPABASE_USERNAME_KEY, 'bootstrap-user');

    const result = await initializeSqliteDatabase(dbName);
    expect(result.error).toBeNull();

    vaultManager.switchUserContext('bootstrap-user');
    vaultManager.lockVault();
  });

  it('registers multiple users and enforces per-user unlock isolation', async () => {
    await vaultManager.registerNewUser('alice', 'alice-password-123');
    vaultManager.lockVault();

    await vaultManager.registerNewUser('bob', 'bob-password-456');
    vaultManager.lockVault();

    const { data: vaultConfigs, error: vaultConfigError } = await sqliteClient
      .from('vault_config')
      .select('user_id')
      .order('user_id', { ascending: true });

    expect(vaultConfigError).toBeNull();
    expect(vaultConfigs?.map((row) => row.user_id)).toEqual(['alice', 'bob']);

    const { data: aliceCategories, error: categoryError } = await sqliteClient
      .from('categories')
      .select('name')
      .eq('user_id', 'alice');

    expect(categoryError).toBeNull();
    expect((aliceCategories || []).length).toBeGreaterThan(0);

    vaultManager.switchUserContext('alice');
    await expect(vaultManager.unlockVault('alice-password-123')).resolves.toBeUndefined();
    vaultManager.lockVault();
    await expect(vaultManager.unlockVault('bob-password-456')).rejects.toThrow();

    vaultManager.switchUserContext('bob');
    await expect(vaultManager.unlockVault('bob-password-456')).resolves.toBeUndefined();
    vaultManager.lockVault();
  });
});
