interface KeyperSqliteBridge {
  init: (dbPath?: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  test: (dbPath?: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  query: (payload: {
    table: string;
    action: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
    select?: string;
    filters?: Array<{ column: string; value: unknown }>;
    order?: { column: string; ascending: boolean };
    limit?: number;
    values?: Record<string, unknown> | Record<string, unknown>[];
    single?: boolean;
    head?: boolean;
    count?: 'exact';
  }) => Promise<{ data: unknown; error: { message: string; code?: string } | null; count?: number | null }>;
}

interface KeyperElectronBridge {
  isElectron: boolean;
  platform: string;
  version: string;
  sqlite?: KeyperSqliteBridge;
}

declare global {
  interface Window {
    keyperElectron?: KeyperElectronBridge;
  }
}

export {};
