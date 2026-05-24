// Simple synchronous token storage abstraction. Defaults to localStorage in
// the browser, no-op on the server (so SSR pages won't crash). Apps can
// inject their own implementation (e.g. cookie-based) by passing one to
// configureApiClient.

export const TOKEN_KEYS = {
  ACCESS: 'dipstick.access_token',
  REFRESH: 'dipstick.refresh_token',
} as const;

export type TokenKey = (typeof TOKEN_KEYS)[keyof typeof TOKEN_KEYS];

export interface TokenStorage {
  get(key: TokenKey): string | null;
  set(key: TokenKey, value: string): void;
  remove(key: TokenKey): void;
}

const noopStorage: TokenStorage = {
  get: () => null,
  set: () => undefined,
  remove: () => undefined,
};

// Reach localStorage through globalThis so this module typechecks under both DOM and Node
// lib configs (core is consumed by the browser apps AND the Node backend).
interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const getLocalStorage = (): WebStorageLike | null => {
  const g = globalThis as { localStorage?: WebStorageLike };
  return g.localStorage ?? null;
};

export const createTokenStorage = (): TokenStorage => {
  const ls = getLocalStorage();
  if (!ls) return noopStorage;
  return {
    get: (key) => ls.getItem(key),
    set: (key, value) => ls.setItem(key, value),
    remove: (key) => ls.removeItem(key),
  };
};
