import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Pages render lazily after several mocked requests; give async queries more time on slow or busy
// machines (the default 1 s is flaky under load).
configure({ asyncUtilTimeout: 5000 });

// Newer Node versions ship their own (file-backed, often disabled) global localStorage that can
// shadow jsdom's. Tests need a working one, so install an in-memory Storage when it is missing.
function memoryStorage(): Storage {
  let store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store = new Map();
    },
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  let usable = false;
  try {
    usable = typeof globalThis[name]?.clear === 'function';
  } catch {
    usable = false;
  }
  if (!usable) {
    Object.defineProperty(globalThis, name, { value: memoryStorage(), configurable: true, writable: true });
  }
}
