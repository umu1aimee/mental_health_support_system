import { escapeHtml } from './ui.js';

export function userBadge(me) {
  if (!me || !me.authenticated) {
    return '<div class="card card-inline"><div class="title">Guest</div><div class="muted">Not logged in</div></div>';
  }
  const name = escapeHtml(me.name || me.email);
  const role = escapeHtml(me.role);
  return `
    <div class="card card-inline">
      <div class="user-meta">
        <div class="title">${name}</div>
        <div class="muted">Signed in</div>
      </div>
      <span class="pill pill-${role}">${role}</span>
    </div>
  `;
}

export function moodChart(entries) {
  const max = 10;
  const bars = (entries || []).map((e) => {
    const rating = Math.max(0, Math.min(max, Number(e.rating || 0)));
    const w = rating * 10;
    return `
      <div class="mood-row">
        <div class="mood-row-top">
          <div>${escapeHtml(e.entryDate)}</div>
          <div><b>${escapeHtml(rating)}</b>/10</div>
        </div>
        <div class="mood-bar">
          <div class="mood-bar-fill" style="width:${w}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="card"><h3>Mood history</h3>${bars || '<p>No entries yet.</p>'}</div>`;
}
