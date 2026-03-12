import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeSqliteDatabase, sqliteClient } from './sqlite-client';

const DEFAULT_CATEGORY_NAMES = [
  'Cloud Services',
  'Development',
  'Finance',
  'Personal',
  'Security',
  'Social Media',
  'Work',
];

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

describe('sqlite default category seeding', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it('creates the 7 shared default categories on first initialization', async () => {
    const dbName = `sqlite-seed-${Date.now()}-first`;
    localStorage.setItem('keyper-sqlite-db-path', dbName);

    const initResult = await initializeSqliteDatabase(dbName);

    expect(initResult.error).toBeNull();

    const { data, error } = await sqliteClient
      .from('categories')
      .select('*')
      .eq('user_id', 'self-hosted-user')
      .order('name');

    expect(error).toBeNull();
    expect(data).toHaveLength(7);
    expect((data as Array<{ name: string }>).map((category) => category.name)).toEqual(DEFAULT_CATEGORY_NAMES);
  }, 15000);

  it('does not duplicate the default categories when initialized again', async () => {
    const dbName = `sqlite-seed-${Date.now()}-repeat`;
    localStorage.setItem('keyper-sqlite-db-path', dbName);

    const firstInit = await initializeSqliteDatabase(dbName);
    const secondInit = await initializeSqliteDatabase(dbName);

    expect(firstInit.error).toBeNull();
    expect(secondInit.error).toBeNull();

    const { count, error } = await sqliteClient
      .from('categories')
      .select('count', { count: 'exact', head: true })
      .eq('user_id', 'self-hosted-user');

    expect(error).toBeNull();
    expect(count).toBe(7);
  }, 15000);
});
