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

export const createTokenStorage = (): TokenStorage => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return noopStorage;
  }
  return {
    get: (key) => window.localStorage.getItem(key),
    set: (key, value) => window.localStorage.setItem(key, value),
    remove: (key) => window.localStorage.removeItem(key),
  };
};
