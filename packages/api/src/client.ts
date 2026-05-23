import ky, { type KyInstance } from 'ky';
import { TOKEN_KEYS, createTokenStorage } from '@dipstick/core';

import { EP } from './endpoints.js';

// Building Ky lazily — and proxying access — sidesteps the captured-prefix-
// URL trap. Older shape built ky at module load time, before configureApiClient
// ever ran, so the prefix was frozen to undefined and every request fell back
// to window.location.origin. Now: createApiClient builds the real instance,
// configureApiClient installs it, and the exported apiClient is a Proxy whose
// every property access forwards to the singleton.

const storage = createTokenStorage();

let _client: KyInstance | null = null;
let _baseUrl: string | null = null;
let refreshPromise: Promise<void> | null = null;

export function createApiClient(baseUrl: string): KyInstance {
  if (!baseUrl) {
    throw new Error('createApiClient: baseUrl is required');
  }
  const prefixUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return ky.create({
    prefixUrl,
    headers: { 'Content-Type': 'application/json' },
    hooks: {
      beforeRequest: [
        (request) => {
          const token = storage.get(TOKEN_KEYS.ACCESS);
          if (token) request.headers.set('Authorization', `Bearer ${token}`);
        },
      ],
      afterResponse: [
        async (request, _options, response) => {
          if (response.status !== 401) return response;
          if (request.url.includes('/auth/')) return response;

          if (!refreshPromise) {
            refreshPromise = (async () => {
              const refresh = storage.get(TOKEN_KEYS.REFRESH);
              if (!refresh) {
                clearTokensAndRedirect();
                return;
              }
              try {
                const res = await ky
                  .post(`${prefixUrl}${EP.AUTH_REFRESH}`, {
                    json: { refresh_token: refresh },
                  })
                  .json<{ data: { access_token: string; refresh_token: string } }>();
                storage.set(TOKEN_KEYS.ACCESS, res.data.access_token);
                storage.set(TOKEN_KEYS.REFRESH, res.data.refresh_token);
              } catch {
                clearTokensAndRedirect();
              } finally {
                refreshPromise = null;
              }
            })();
          }

          await refreshPromise;

          const newToken = storage.get(TOKEN_KEYS.ACCESS);
          if (newToken) request.headers.set('Authorization', `Bearer ${newToken}`);
          return ky(request);
        },
      ],
    },
  });
}

export function configureApiClient(baseUrl: string): void {
  _baseUrl = baseUrl;
  _client = createApiClient(baseUrl);
}

export const apiClient: KyInstance = new Proxy({} as KyInstance, {
  get(_target, prop) {
    if (!_client) {
      throw new Error(
        'apiClient used before configureApiClient was called. Call configureApiClient(baseUrl) at app boot.',
      );
    }
    return Reflect.get(_client, prop, _client);
  },
});

export function _currentApiBaseUrl(): string | null {
  return _baseUrl;
}

function clearTokensAndRedirect() {
  storage.remove(TOKEN_KEYS.ACCESS);
  storage.remove(TOKEN_KEYS.REFRESH);
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
