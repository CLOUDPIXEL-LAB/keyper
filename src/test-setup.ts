/**
 * Test setup configuration for Vitest
 *
 * Sets up testing environment with jsdom and testing library utilities.
 *
 * Made with ❤️ by Pink Pixel ✨
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { webcrypto } from 'node:crypto';

// Use Node's WebCrypto implementation for deterministic crypto semantics in tests.
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
});

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key) => {
      if (key === 'keyper-supabase-url') return 'https://your-project.supabase.co';
      if (key === 'keyper-supabase-key') return 'your-anon-key';
      return null;
    }),
    setItem: vi.fn((key, value) => {
      console.log(`${key} set to ${value}`);
    }),
    removeItem: vi.fn((key) => {
      console.log(`${key} removed`);
    }),
    clear: vi.fn(() => {
      console.log('localStorage cleared');
    }),
  },
});

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

// Mock window.location
Object.defineProperty(global, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Environment)',
  },
});

// Mock document visibility API
Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true,
});

Object.defineProperty(document, 'visibilityState', {
  value: 'visible',
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Argon2 for testing
vi.mock('argon2-browser/dist/argon2-bundled.min.js', () => ({
  default: {
    ArgonType: {
      Argon2d: 0,
      Argon2i: 1,
      Argon2id: 2,
    },
    hash: vi.fn().mockImplementation(async (options: { pass: string; salt: Uint8Array; hashLen?: number }) => {
      // Deterministic, salt-sensitive pseudo-Argon2 hash for tests.
      const passBytes = new TextEncoder().encode(options.pass);
      const combined = new Uint8Array(passBytes.length + options.salt.length);
      combined.set(passBytes, 0);
      combined.set(options.salt, passBytes.length);

      const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', combined));
      const hash = new Uint8Array(options.hashLen || 32);
      for (let i = 0; i < hash.length; i++) {
        hash[i] = digest[i % digest.length] ^ options.salt[i % options.salt.length] ^ ((i * 31) & 0xff);
      }

      return {
        hash,
        hashHex: Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join(''),
        encoded: '$argon2id$v=19$m=65536,t=3,p=1$' + btoa(String.fromCharCode(...options.salt)) + '$' + btoa(String.fromCharCode(...hash))
      };
    })
  }
}));

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings that are expected in test environment
  if (
    args[0]?.includes?.('React Router') ||
    args[0]?.includes?.('useNavigate') ||
    args[0]?.includes?.('Warning: ReactDOM.render') ||
    args[0]?.includes?.('Failed to parse URL from //argon2.wasm')
  ) {
    return;
  }
  originalWarn(...args);
};
