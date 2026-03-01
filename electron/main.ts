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
  protocol,
  net,
  shell,
  session,
} from 'electron';
import * as path from 'path';
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
    // Use the project's logo as the window / taskbar icon
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
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
