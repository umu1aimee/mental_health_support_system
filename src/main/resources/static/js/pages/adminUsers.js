import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast } from '../ui.js';

function includesText(haystack, needle) {
  const h = (haystack ?? '').toString().toLowerCase();
  const n = (needle ?? '').toString().trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

function userRow(u) {
  const activeLabel = u.active ? 'Active' : 'Inactive';
  const specialty = u.specialty || '-';
  
  const rolePillClass = u.role === 'admin' ? 'pill-admin' : u.role === 'counselor' ? 'pill-counselor' : 'pill-patient';

  return `
    <tr>
      <td>${escapeHtml(u.name || '-')}</td>
      <td>${escapeHtml(u.email || '')}</td>
      <td><span class="pill ${rolePillClass}">${escapeHtml(u.role)}</span></td>
      <td>${escapeHtml(specialty)}</td>
      <td><span class="pill ${u.active ? 'pill-success' : 'pill-muted'}">${escapeHtml(activeLabel)}</span></td>
      <td>
        <div class="actions" style="margin:0">
          <button class="btn-secondary" data-edit-user="${u.id}">Edit</button>
          <button class="btn-secondary" data-toggle-active="${u.id}" data-active="${u.active ? '1' : '0'}">${u.active ? 'Deactivate' : 'Activate'}</button>
          <button class="btn-danger" data-delete-user="${u.id}" data-user-name="${escapeHtml(u.name || u.email)}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

export async function loadAdminUsers() {
  try {
    requireRole(state.me, 'admin');

    const [users, profileChanges] = await Promise.all([
      api('/admin/users'),
      api('/admin/profile-changes'),
    ]);

    const createCounselorCard = `
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
        <div class="field">
          <label>Specialty (optional)</label>
          <input id="create-c-specialty" type="text" placeholder="e.g. Anxiety, Teens, Trauma" />
        </div>
        <div class="actions">
          <button id="btn-create-counselor">Create counselor</button>
        </div>
      </div>
    `;

    const createAdminCard = `
      <div class="card">
        <h2>Create Admin</h2>
        <div class="grid-3">
          <div class="field">
            <label>Name</label>
            <input id="create-a-name" type="text" />
          </div>
          <div class="field">
            <label>Email</label>
            <input id="create-a-email" type="email" />
          </div>
          <div class="field">
            <label>Temporary Password</label>
            <input id="create-a-password" type="password" />
          </div>
        </div>
        <div class="actions">
          <button id="btn-create-admin">Create admin</button>
        </div>
      </div>
    `;

    const profileRows = (profileChanges || []).map((c) => {
      return `
        <tr>
          <td>${escapeHtml(c.description || '')}</td>
          <td>${escapeHtml(c.userRole || '')}</td>
          <td>${escapeHtml(c.userName || c.userEmail || '')}</td>
          <td>${escapeHtml(c.createdAt || '')}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="4" class="muted">No recent profile updates.</td></tr>`;

    renderMain(`
      <div class="grid-2">
        ${createCounselorCard}
        ${createAdminCard}
      </div>

      <h2>Recent profile updates</h2>
      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Role</th>
              <th>User</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            ${profileRows}
          </tbody>
        </table>
      </div>

      <h2>Users</h2>
      <div class="card">
        <div class="grid-3">
          <div class="field">
            <label>Search</label>
            <input id="au-search" type="text" placeholder="Search name, email, role, specialty" />
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
            <label>Status</label>
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

      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Specialty</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="au-list"></tbody>
        </table>
      </div>

      <!-- Edit User Modal -->
      <div id="edit-modal" class="modal-overlay" style="display:none;">
        <div class="modal-content card">
          <div class="row-between">
            <h2>Edit User</h2>
            <button class="btn-ghost modal-close" id="edit-modal-close">&times;</button>
          </div>
          <div class="field">
            <label>Name</label>
            <input id="edit-name" type="text" />
          </div>
          <div class="field">
            <label>Email</label>
            <input id="edit-email" type="email" />
          </div>
          <div class="field" id="edit-specialty-field">
            <label>Specialty (for counselors)</label>
            <input id="edit-specialty" type="text" placeholder="e.g. Anxiety, Depression, Trauma" />
          </div>
          <div class="field">
            <label>Role</label>
            <input id="edit-role" type="text" disabled class="muted" />
            <p class="hint">Role cannot be changed</p>
          </div>
          <input type="hidden" id="edit-user-id" />
          <div class="actions">
            <button id="btn-save-edit" class="btn-primary">Save Changes</button>
            <button id="btn-cancel-edit" class="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div id="delete-modal" class="modal-overlay" style="display:none;">
        <div class="modal-content card">
          <h2>Confirm Delete</h2>
          <p>Are you sure you want to delete user <strong id="delete-user-name"></strong>?</p>
          <p class="muted">This action cannot be undone.</p>
          <input type="hidden" id="delete-user-id" />
          <div class="actions">
            <button id="btn-confirm-delete" class="btn-danger">Yes, Delete</button>
            <button id="btn-cancel-delete" class="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    `);

    const allUsers = users || [];
    const listEl = document.getElementById('au-list');
    const qEl = document.getElementById('au-search');
    const roleEl = document.getElementById('au-role');
    const activeEl = document.getElementById('au-active');
    const clearEl = document.getElementById('au-clear');

    // Edit modal elements
    const editModal = document.getElementById('edit-modal');
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editSpecialty = document.getElementById('edit-specialty');
    const editSpecialtyField = document.getElementById('edit-specialty-field');
    const editRole = document.getElementById('edit-role');
    const editUserId = document.getElementById('edit-user-id');

    // Delete modal elements
    const deleteModal = document.getElementById('delete-modal');
    const deleteUserName = document.getElementById('delete-user-name');
    const deleteUserId = document.getElementById('delete-user-id');

    // Close edit modal
    document.getElementById('edit-modal-close').addEventListener('click', () => {
      editModal.style.display = 'none';
    });
    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
      editModal.style.display = 'none';
    });
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) editModal.style.display = 'none';
    });

    // Close delete modal
    document.getElementById('btn-cancel-delete').addEventListener('click', () => {
      deleteModal.style.display = 'none';
    });
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) deleteModal.style.display = 'none';
    });

    // Save edit
    document.getElementById('btn-save-edit').addEventListener('click', async () => {
      try {
        const id = editUserId.value;
        const name = editName.value;
        const email = editEmail.value;
        const specialty = editSpecialty.value;
        
        await api(`/admin/users/${id}`, { 
          method: 'PUT', 
          body: { name, email, specialty } 
        });
        
        toast('User updated successfully', 'success');
        editModal.style.display = 'none';
        await loadAdminUsers();
      } catch (e) {
        toast(e.message || 'Failed to update user', 'error');
      }
    });

    // Confirm delete
    document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
      try {
        const id = deleteUserId.value;
        await api(`/admin/users/${id}`, { method: 'DELETE' });
        toast('User deleted', 'success');
        deleteModal.style.display = 'none';
        await loadAdminUsers();
      } catch (e) {
        toast(e.message || 'Failed to delete user', 'error');
      }
    });

    document.getElementById('btn-create-counselor').addEventListener('click', async () => {
      try {
        const name = document.getElementById('create-c-name').value;
        const email = document.getElementById('create-c-email').value;
        const password = document.getElementById('create-c-password').value;
        const specialty = document.getElementById('create-c-specialty').value;
        await api('/admin/counselors', { method: 'POST', body: { name, email, password, specialty } });
        toast('Counselor created', 'success');
        await loadAdminUsers();
      } catch (e) {
        renderError(e);
      }
    });

    document.getElementById('btn-create-admin').addEventListener('click', async () => {
      try {
        const name = document.getElementById('create-a-name').value;
        const email = document.getElementById('create-a-email').value;
        const password = document.getElementById('create-a-password').value;
        await api('/admin/admins', { method: 'POST', body: { name, email, password } });
        toast('Admin created', 'success');
        await loadAdminUsers();
      } catch (e) {
        renderError(e);
      }
    });

    const bindUserActions = () => {
      // Edit buttons
      document.querySelectorAll('#au-list [data-edit-user]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-edit-user');
          const user = allUsers.find(u => String(u.id) === id);
          if (!user) return;

          editUserId.value = user.id;
          editName.value = user.name || '';
          editEmail.value = user.email || '';
          editSpecialty.value = user.specialty || '';
          editRole.value = user.role || '';

          // Show specialty field only for counselors
          editSpecialtyField.style.display = user.role === 'counselor' ? 'block' : 'none';

          editModal.style.display = 'flex';
        });
      });

      // Toggle active buttons
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

      // Delete buttons - show confirmation modal
      document.querySelectorAll('#au-list [data-delete-user]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-delete-user');
          const name = btn.getAttribute('data-user-name');
          deleteUserId.value = id;
          deleteUserName.textContent = name;
          deleteModal.style.display = 'flex';
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
        const haystack = `${u.name || ''} ${u.email || ''} ${u.role || ''} ${u.specialty || ''}`;
        return includesText(haystack, q);
      });

      if (!filtered.length) {
        listEl.innerHTML = `<tr><td colspan="6" class="muted">No users match your search.</td></tr>`;
      } else {
        listEl.innerHTML = filtered.map(userRow).join('');
      }
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
