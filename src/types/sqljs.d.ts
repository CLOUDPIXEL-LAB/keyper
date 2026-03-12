declare module 'sql.js' {
  const initSqlJs: (config?: { locateFile?: (file: string) => string }) => Promise<{
    Database: new (data?: Uint8Array) => {
      run: (sql: string, params?: unknown[]) => void;
      prepare: (sql: string) => {
        bind: (params?: Record<string, unknown> | unknown[]) => boolean;
        step: () => boolean;
        getAsObject: () => Record<string, unknown>;
        free: () => void;
      };
      export: () => Uint8Array;
      close?: () => void;
    };
  }>;

  export default initSqlJs;
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const src: string;
  export default src;
}
