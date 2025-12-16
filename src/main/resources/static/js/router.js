const routes = new Map();

export function defineRoute(path, handler) {
  routes.set(path, handler);
}

export function getRoute() {
  const hash = (window.location.hash || '').replace(/^#/, '');
  return hash || '/';
}

export async function navigate(path) {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  window.location.hash = path;
}

export async function runRoute() {
  const full = getRoute();
  const [path, query] = full.split('?');
  const handler = routes.get(path) || routes.get('/404');
  if (!handler) {
    return;
  }
  const params = new URLSearchParams(query || '');
  await handler({ path, params, full });
}

export function startRouter() {
  window.addEventListener('hashchange', () => {
    runRoute();
  });
}
