const API_BASE = '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
  };

  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const resp = await fetch(API_BASE + path, opts);
  const text = await resp.text();

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
