import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast } from '../ui.js';

function includesText(haystack, needle) {
  const h = (haystack ?? '').toString().toLowerCase();
  const n = (needle ?? '').toString().trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

function appointmentRow(a) {
  const patientName = a.patient ? (a.patient.name || a.patient.email) : '';
  const patientEmail = a.patient ? (a.patient.email || '') : '';
  return `
    <tr>
      <td>${escapeHtml(a.appointmentDate)}</td>
      <td>${escapeHtml(a.appointmentTime)}</td>
      <td>${escapeHtml(patientName)}</td>
      <td>${escapeHtml(patientEmail)}</td>
      <td><span class="pill">${escapeHtml(a.status)}</span></td>
      <td>
        <div class="actions" style="margin:0">
          <button data-status-id="${a.id}" data-status="confirmed">Confirm</button>
          <button class="btn-secondary" data-status-id="${a.id}" data-status="canceled">Cancel</button>
        </div>
      </td>
    </tr>
  `;
}

export async function loadCounselorAppointments() {
  try {
    requireRole(state.me, 'counselor');

    const aps = await api('/counselor/appointments');

    renderMain(`
      <div class="card">
        <h2>Appointments</h2>
        <p class="muted">Confirm or cancel scheduled appointments.</p>
      </div>
      <div class="card">
        <div class="grid-3">
          <div class="field">
            <label>Search</label>
            <input id="cap-search" type="text" placeholder="Search patient, date, status" />
          </div>
          <div class="field">
            <label>Status</label>
            <select id="cap-status">
              <option value="all">all</option>
              <option value="scheduled">scheduled</option>
              <option value="confirmed">confirmed</option>
              <option value="canceled">canceled</option>
            </select>
          </div>
          <div class="field">
            <label> </label>
            <button class="btn-secondary" id="cap-clear">Clear</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card">
          <h3>Scheduled with you</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Patient</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="cap-list"></tbody>
          </table>
        </div>
      </div>
    `);

    const allAppointments = aps || [];
    const listEl = document.getElementById('cap-list');
    const qEl = document.getElementById('cap-search');
    const statusEl = document.getElementById('cap-status');
    const clearEl = document.getElementById('cap-clear');

    const bindStatusButtons = () => {
      document.querySelectorAll('#cap-list [data-status-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            const id = btn.getAttribute('data-status-id');
            const status = btn.getAttribute('data-status');
            await api(`/counselor/appointments/${id}/status`, { method: 'POST', body: { status } });
            toast('Appointment updated', 'success');
            await loadCounselorAppointments();
          } catch (e) {
            renderError(e);
          }
        });
      });
    };

    const renderAppointments = () => {
      const q = qEl.value;
      const status = statusEl.value;

      const filtered = allAppointments.filter((a) => {
        if (status !== 'all' && String(a.status) !== status) return false;
        const patientName = a.patient ? (a.patient.name || a.patient.email) : '';
        const haystack = `${a.appointmentDate} ${a.appointmentTime} ${a.status} ${patientName}`;
        return includesText(haystack, q);
      });

      listEl.innerHTML = filtered.map(appointmentRow).join('');
      if (!filtered.length) {
        listEl.innerHTML = `<tr><td colspan="6" class="muted">No appointments match your search.</td></tr>`;
      }
      bindStatusButtons();
    };

    qEl.addEventListener('input', renderAppointments);
    statusEl.addEventListener('change', renderAppointments);
    clearEl.addEventListener('click', () => {
      qEl.value = '';
      statusEl.value = 'all';
      renderAppointments();
    });

    renderAppointments();
  } catch (e) {
    renderError(e);
  }
}
