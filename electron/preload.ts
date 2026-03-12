/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        🔐  Keyper  –  Electron Preload Script               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Runs in the renderer process but in an ISOLATED context (before
 * any renderer code).  Exposes a minimal, typed bridge through
 * `window.keyperElectron` so that the React app can detect it is
 * running inside Electron and react accordingly (e.g. hide a
 * download-PWA banner, adjust window-title behaviour, etc.).
 *
 * IMPORTANT: Keep this surface as small as possible.  Never
 * expose raw `ipcRenderer` or any unrestricted Node.js API.
 */

import { contextBridge } from 'electron';

/** The API surface exposed to the renderer under `window.keyperElectron` */
export interface KeyperElectronBridge {
  /** Always `true` – lets the renderer detect it is inside Electron. */
  isElectron: boolean;
  /** The running platform: 'linux' | 'darwin' | 'win32' */
  platform: NodeJS.Platform;
  /** Application version from package.json (populated by electron-builder). */
  version: string;
  /** Electron-only SQLite bridge used by local database mode. */
  sqlite: {
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
  };
}

contextBridge.exposeInMainWorld('keyperElectron', {
  isElectron: true,
  platform: process.platform,
  version: process.env.npm_package_version ?? app_version(),
  sqlite: {
    init: (dbPath?: string) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron');
      return ipcRenderer.invoke('keyper:sqlite:init', { path: dbPath });
    },
    test: (dbPath?: string) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron');
      return ipcRenderer.invoke('keyper:sqlite:test', { path: dbPath });
    },
    query: (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcRenderer } = require('electron');
      return ipcRenderer.invoke('keyper:sqlite:query', payload);
    },
  },
} satisfies KeyperElectronBridge);

/** Fallback version reader – only reached if the env var is missing. */
function app_version(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return (require('../package.json') as { version: string }).version;
  } catch {
    return '0.0.0';
  }
}
