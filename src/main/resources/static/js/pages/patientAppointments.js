import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast, toDayOfWeekInt } from '../ui.js';

function includesText(haystack, needle) {
  const h = (haystack ?? '').toString().toLowerCase();
  const n = (needle ?? '').toString().trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

function toDayName(dayOfWeek) {
  switch (Number(dayOfWeek)) {
    case 0: return 'Sunday';
    case 1: return 'Monday';
    case 2: return 'Tuesday';
    case 3: return 'Wednesday';
    case 4: return 'Thursday';
    case 5: return 'Friday';
    case 6: return 'Saturday';
    default: return `Day ${dayOfWeek}`;
  }
}

function appointmentCard(a) {
  const counselorName = a.counselor ? (a.counselor.name || a.counselor.email) : '';
  const cancelBtn = a.status !== 'canceled'
    ? `<button class="btn-secondary" data-cancel-id="${a.id}">Cancel</button>`
    : '';

  return `
    <div class="card">
      <div class="row-between">
        <div>
          <div class="title">${escapeHtml(a.appointmentDate)} ${escapeHtml(a.appointmentTime)}</div>
          <div class="muted">Counselor: ${escapeHtml(counselorName)}</div>
        </div>
        <div class="pill">${escapeHtml(a.status)}</div>
      </div>
      <div class="actions">
        ${cancelBtn}
      </div>
    </div>
  `;
}

export async function loadPatientAppointments() {
  try {
    requireRole(state.me, 'patient');

    const [counselors, myAppointments] = await Promise.all([
      api('/patient/counselors'),
      api('/patient/appointments'),
    ]);

    const counselorOptions = counselors
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name || c.email)}</option>`)
      .join('');

    renderMain(`
      <div class="card">
        <h2>Book Appointment</h2>
        <div class="grid-3">
          <div class="field">
            <label>Counselor</label>
            <select id="ap-counselor">${counselorOptions}</select>
          </div>
          <div class="field">
            <label>Date</label>
            <input id="ap-date" type="date" />
          </div>
          <div class="field">
            <label>Time</label>
            <input id="ap-time" type="time" />
          </div>
        </div>
        <div class="actions">
          <button id="btn-book">Book</button>
          <button class="btn-secondary" id="btn-check">Check counselor availability</button>
        </div>
        <div id="ap-availability"></div>
      </div>

      <h2>My Appointments</h2>
      <div class="card">
        <div class="grid-3">
          <div class="field">
            <label>Search</label>
            <input id="ap-search" type="text" placeholder="Search counselor, date, status" />
          </div>
          <div class="field">
            <label>Status</label>
            <select id="ap-status">
              <option value="all">all</option>
              <option value="scheduled">scheduled</option>
              <option value="confirmed">confirmed</option>
              <option value="canceled">canceled</option>
            </select>
          </div>
          <div class="field">
            <label> </label>
            <button class="btn-secondary" id="ap-clear">Clear</button>
          </div>
        </div>
      </div>
      <div id="ap-list"></div>
    `);

    const allAppointments = myAppointments || [];
    const listEl = document.getElementById('ap-list');
    const qEl = document.getElementById('ap-search');
    const statusEl = document.getElementById('ap-status');
    const clearEl = document.getElementById('ap-clear');

    const bindCancelHandlers = () => {
      document.querySelectorAll('#ap-list [data-cancel-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            const id = btn.getAttribute('data-cancel-id');
            await api(`/patient/appointments/${id}/cancel`, { method: 'POST' });
            toast('Appointment canceled', 'success');
            await loadPatientAppointments();
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
        const counselorName = a.counselor ? (a.counselor.name || a.counselor.email) : '';
        const haystack = `${a.appointmentDate} ${a.appointmentTime} ${a.status} ${counselorName}`;
        return includesText(haystack, q);
      });

      listEl.innerHTML = filtered.map(appointmentCard).join('') || '<div class="card">No appointments match your search.</div>';
      bindCancelHandlers();
    };

    qEl.addEventListener('input', renderAppointments);
    statusEl.addEventListener('change', renderAppointments);
    clearEl.addEventListener('click', () => {
      qEl.value = '';
      statusEl.value = 'all';
      renderAppointments();
    });

    renderAppointments();

    document.getElementById('btn-check').addEventListener('click', async () => {
      try {
        const counselorId = document.getElementById('ap-counselor').value;
        const dateStr = document.getElementById('ap-date').value;
        if (!counselorId) throw new Error('Select a counselor');
        if (!dateStr) throw new Error('Select a date to check availability');
        const dow = toDayOfWeekInt(dateStr);
        const slots = await api(`/patient/counselors/${counselorId}/availability?dayOfWeek=${dow}`);
        const html = (slots || [])
          .map((s) => `<div>${escapeHtml(toDayName(s.dayOfWeek))}: ${escapeHtml(s.startTime)} - ${escapeHtml(s.endTime)}</div>`)
          .join('') || '<div class="muted">No availability configured for that day.</div>';
        document.getElementById('ap-availability').innerHTML = `<div class="card"><h3>Availability</h3>${html}<p class="hint">Pick a time within the available window.</p></div>`;
      } catch (e) {
        renderError(e);
      }
    });

    document.getElementById('btn-book').addEventListener('click', async () => {
      try {
        const counselorId = Number(document.getElementById('ap-counselor').value);
        const appointmentDate = document.getElementById('ap-date').value;
        const appointmentTime = document.getElementById('ap-time').value;
        if (!counselorId) throw new Error('Choose a counselor');
        if (!appointmentDate) throw new Error('Choose a date');
        if (!appointmentTime) throw new Error('Choose a time');
        if (!/^[0-2][0-9]:[0-5][0-9]$/.test(appointmentTime)) {
          throw new Error('Enter time as HH:MM');
        }
        await api('/patient/appointments', {
          method: 'POST',
          body: { counselorId, appointmentDate, appointmentTime },
        });
        toast('Appointment booked', 'success');
        await loadPatientAppointments();
      } catch (e) {
        renderError(e);
      }
    });
  } catch (e) {
    renderError(e);
  }
}
