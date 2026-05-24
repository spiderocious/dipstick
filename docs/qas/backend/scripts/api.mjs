// Shared HTTP wrapper for the Dipstick backend QA suite. Plain Node fetch (Node 18+).
export const BASE = process.env.QA_BASE ?? 'http://localhost:8081/api/v1';

export async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  // Guard 204 / empty bodies — never .json() an empty response.
  let data = null;
  const text = await res.text();
  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { __raw: text };
    }
  }
  return { status: res.status, data, headers: res.headers, raw: text };
}

export const get = (path, token, opts = {}) => request(path, { ...opts, method: 'GET', token });
export const post = (path, body, token, opts = {}) =>
  request(path, { ...opts, method: 'POST', body, token });
export const patch = (path, body, token, opts = {}) =>
  request(path, { ...opts, method: 'PATCH', body, token });
export const put = (path, body, token, opts = {}) =>
  request(path, { ...opts, method: 'PUT', body, token });
export const del = (path, token, opts = {}) => request(path, { ...opts, method: 'DELETE', token });

// Unique-per-run helpers so re-runs don't collide on unique constraints.
const STAMP = Date.now();
let seq = 0;
export const uniq = () => `${STAMP}-${seq++}`;
export const uniqEmail = (label = 'u') => `${label}-${uniq()}@qa.test`;
// Nigerian-style phone, 13 chars, unique tail. min(10) max(20) on the schema.
export const uniqPhone = () => `+234${String(8000000000 + (STAMP % 1000000000) + seq++).slice(0, 10)}`;
