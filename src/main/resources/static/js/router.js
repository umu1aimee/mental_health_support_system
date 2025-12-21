/**
 * Minimal hash-based SPA router.
 *
 * Goals:
 * - Keep routing logic simple and framework-free
 * - Centralize navigation to avoid scattered `location.hash` writes
 * - Support query params via `URLSearchParams`
 */
const routes = new Map();

/**
 * Register a route handler.
 * @param {string} path e.g. "/login"
 * @param {(ctx: {path: string, params: URLSearchParams, full: string}) => (void|Promise<void>)} handler
 */
export function defineRoute(path, handler) {
  routes.set(path, handler);
}

/**
 * Read current route from location hash.
 * @returns {string} route string without leading '#'
 */
export function getRoute() {
  const hash = (window.location.hash || '').replace(/^#/, '');
  return hash || '/';
}

/**
 * Navigate to a route (updates hash).
 * @param {string} path absolute or relative ("/x" or "x")
 */
export async function navigate(path) {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  window.location.hash = path;
}

/**
 * Resolve current route and execute its handler.
 */
export async function runRoute() {
  const full = getRoute();
  const [path, query] = full.split('?');
  const handler = routes.get(path) || routes.get('/404');
  if (!handler) return;

  const params = new URLSearchParams(query || '');
  await handler({ path, params, full });
}

/**
 * Start listening for hash changes.
 */
export function startRouter() {
  window.addEventListener('hashchange', () => {
    runRoute();
  });
}
