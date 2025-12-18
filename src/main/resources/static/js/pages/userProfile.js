import { api } from '../api.js';
import { state, setState } from '../state.js';
import { escapeHtml, renderMain, renderError, requireAuth, toast } from '../ui.js';

export async function loadUserProfile() {
  try {
    requireAuth(state.me);
    const profile = await api('/user/profile');

    const role = profile.role;
    const isPatient = role === 'patient';
    const isCounselor = role === 'counselor';

    renderMain(`
      <div class="card">
        <h2>My Profile</h2>
        <p class="muted">Update your information. Changes are visible to admins.</p>
        <div class="grid-2">
          <div class="field">
            <label>Email</label>
            <input type="email" value="${escapeHtml(profile.email)}" disabled />
          </div>
          <div class="field">
            <label>Name</label>
            <input id="profile-name" type="text" value="${escapeHtml(profile.name || '')}" />
          </div>
        </div>
        ${isCounselor ? `
          <div class="field">
            <label>Specialty</label>
            <input id="profile-specialty" type="text" value="${escapeHtml(profile.specialty || '')}" placeholder="e.g. Anxiety, Teens, Trauma" />
          </div>
        ` : ''}
        ${isPatient ? `
          <div class="field">
            <label>Emergency contact</label>
            <input id="profile-emergency" type="text" value="${escapeHtml(profile.emergencyContact || '')}" />
          </div>
        ` : ''}
        <div class="actions">
          <button id="btn-save-profile">Save changes</button>
        </div>
      </div>
    `);

    document.getElementById('btn-save-profile').addEventListener('click', async () => {
      try {
        const name = document.getElementById('profile-name').value;
        const body = { name };
        if (isCounselor) {
          body.specialty = document.getElementById('profile-specialty').value;
        }
        if (isPatient) {
          body.emergencyContact = document.getElementById('profile-emergency').value;
        }
        const updated = await api('/user/profile', { method: 'PUT', body });
        // refresh global "me" for header badge
        const me = await api('/auth/me');
        setState({ me });
        toast('Profile updated', 'success');
        await loadUserProfile();
      } catch (e) {
        renderError(e);
      }
    });
  } catch (e) {
    renderError(e);
  }
}


