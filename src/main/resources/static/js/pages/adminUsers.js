import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast } from '../ui.js';

function includesText(haystack, needle) {
  const h = (haystack ?? '').toString().toLowerCase();
  const n = (needle ?? '').toString().trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

function userCard(u) {
  return `
    <div class="card">
      <div class="row-between">
        <div>
          <div class="title">${escapeHtml(u.name || u.email)}</div>
          <div class="muted">${escapeHtml(u.email)}</div>
        </div>
        <div class="pill">${escapeHtml(u.role)}</div>
      </div>

      <div class="muted">Active: ${escapeHtml(u.active)}</div>

      <div class="actions">
        <select data-role-user="${u.id}">
          <option value="patient" ${u.role === 'patient' ? 'selected' : ''}>patient</option>
          <option value="counselor" ${u.role === 'counselor' ? 'selected' : ''}>counselor</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
        </select>
        <button class="btn-secondary" data-save-role="${u.id}">Change role</button>
        <button class="btn-secondary" data-toggle-active="${u.id}" data-active="${u.active ? '1' : '0'}">${u.active ? 'Deactivate' : 'Activate'}</button>
        <button class="btn-danger" data-delete-user="${u.id}">Delete</button>
      </div>
    </div>
  `;
}

export async function loadAdminUsers() {
  try {
    requireRole(state.me, 'admin');

    const users = await api('/admin/users');

    const createCard = `
      <div class="card">
        <h2>Create Counselor</h2>
        <div class="grid-3">
          <div class="field">
            <label>Name</label>
            <input id="create-c-name" type="text" />
          </div>
          <div class="field">
            <label>Email</label>
            <input id="create-c-email" type="email" />
          </div>
          <div class="field">
            <label>Temporary Password</label>
            <input id="create-c-password" type="password" />
          </div>
        </div>
        <div class="actions">
          <button id="btn-create-counselor">Create counselor</button>
        </div>
      </div>
    `;

    renderMain(`
      ${createCard}

      <h2>Users</h2>
      <div class="card">
        <div class="grid-3">
          <div class="field">
            <label>Search</label>
            <input id="au-search" type="text" placeholder="Search name, email" />
          </div>
          <div class="field">
            <label>Role</label>
            <select id="au-role">
              <option value="all">all</option>
              <option value="patient">patient</option>
              <option value="counselor">counselor</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div class="field">
            <label>Active</label>
            <select id="au-active">
              <option value="all">all</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
        </div>
        <div class="actions" style="margin-top: .75rem">
          <button class="btn-secondary" id="au-clear">Clear</button>
        </div>
      </div>

      <div id="au-list"></div>
    `);

    const allUsers = users || [];
    const listEl = document.getElementById('au-list');
    const qEl = document.getElementById('au-search');
    const roleEl = document.getElementById('au-role');
    const activeEl = document.getElementById('au-active');
    const clearEl = document.getElementById('au-clear');

    document.getElementById('btn-create-counselor').addEventListener('click', async () => {
      try {
        const name = document.getElementById('create-c-name').value;
        const email = document.getElementById('create-c-email').value;
        const password = document.getElementById('create-c-password').value;
        await api('/admin/counselors', { method: 'POST', body: { name, email, password } });
        toast('Counselor created', 'success');
        await loadAdminUsers();
      } catch (e) {
        renderError(e);
      }
    });

    const bindUserActions = () => {
      document.querySelectorAll('#au-list [data-save-role]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            const id = btn.getAttribute('data-save-role');
            const sel = document.querySelector(`select[data-role-user="${id}"]`);
            await api(`/admin/users/${id}/role`, { method: 'POST', body: { role: sel.value } });
            toast('Role updated', 'success');
            await loadAdminUsers();
          } catch (e) {
            renderError(e);
          }
        });
      });

      document.querySelectorAll('#au-list [data-toggle-active]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            const id = btn.getAttribute('data-toggle-active');
            const current = btn.getAttribute('data-active') === '1';
            await api(`/admin/users/${id}/active`, { method: 'POST', body: { active: !current } });
            toast('User updated', 'success');
            await loadAdminUsers();
          } catch (e) {
            renderError(e);
          }
        });
      });

      document.querySelectorAll('#au-list [data-delete-user]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            const id = btn.getAttribute('data-delete-user');
            const ok = window.confirm('Delete this user?');
            if (!ok) return;
            await api(`/admin/users/${id}`, { method: 'DELETE' });
            toast('User deleted', 'success');
            await loadAdminUsers();
          } catch (e) {
            renderError(e);
          }
        });
      });
    };

    const renderUsers = () => {
      const q = qEl.value;
      const role = roleEl.value;
      const active = activeEl.value;

      const filtered = allUsers.filter((u) => {
        if (role !== 'all' && String(u.role) !== role) return false;
        if (active !== 'all') {
          const isActive = Boolean(u.active);
          if (active === 'active' && !isActive) return false;
          if (active === 'inactive' && isActive) return false;
        }
        const haystack = `${u.name || ''} ${u.email || ''} ${u.role || ''}`;
        return includesText(haystack, q);
      });

      listEl.innerHTML = filtered.map(userCard).join('') || '<div class="card">No users match your search.</div>';
      bindUserActions();
    };

    qEl.addEventListener('input', renderUsers);
    roleEl.addEventListener('change', renderUsers);
    activeEl.addEventListener('change', renderUsers);
    clearEl.addEventListener('click', () => {
      qEl.value = '';
      roleEl.value = 'all';
      activeEl.value = 'all';
      renderUsers();
    });

    renderUsers();
  } catch (e) {
    renderError(e);
  }
}
