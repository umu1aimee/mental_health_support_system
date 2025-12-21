/**
 * Lightweight API client wrapper around `fetch`.
 *
 * Conventions:
 * - JSON request/response by default
 * - throws Error on non-2xx responses with `err.status` + `err.data` attached
 * - uses `credentials: 'same-origin'` so session cookies work with Spring Boot sessions
 */
const API_BASE = '/api';

/**
 * Call a backend API endpoint.
 * @template T
 * @param {string} path path relative to `/api` (e.g. "/auth/me")
 * @param {{method?: string, body?: any}} [options]
 * @returns {Promise<T>}
 */
export async function api(path, { method = 'GET', body } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
  };

  // Only attach a body when explicitly provided.
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const resp = await fetch(API_BASE + path, opts);
  const text = await resp.text();

  // Parse JSON if possible; otherwise return raw text.
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!resp.ok) {
    const msg = data && typeof data === 'object' && data.error ? data.error : `API error: ${resp.status}`;
    const err = new Error(msg);
    err.status = resp.status;
    err.data = data;
    throw err;
  }

  return data;
}
