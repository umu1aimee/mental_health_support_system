export function escapeHtml(s) {
  return (s ?? '')
    .toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function renderMain(html) {
  qs('#main-content').innerHTML = html;
}

export function setBusy(isBusy) {
  document.body.classList.toggle('is-busy', Boolean(isBusy));
}

export function toast(message, type = 'info') {
  const root = qs('#toast-root');
  if (!root) {
    alert(message);
    return;
  }

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  root.appendChild(el);

  window.setTimeout(() => {
    el.classList.add('toast-hide');
    window.setTimeout(() => el.remove(), 250);
  }, 2800);
}

export function renderError(err) {
  const msg = err?.message || String(err);
  renderMain(`<div class="card"><h2>Error</h2><p>${escapeHtml(msg)}</p></div>`);
}

export function requireAuth(me) {
  if (!me || !me.authenticated) {
    throw new Error('Not authenticated');
  }
}

export function requireRole(me, role) {
  requireAuth(me);
  if (me.role !== role) {
    throw new Error('Access denied');
  }
}

export function toDayOfWeekInt(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay();
}
