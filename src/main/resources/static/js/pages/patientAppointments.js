import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast, toDayOfWeekInt } from '../ui.js';
import { getRoute } from '../router.js';

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

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function getStatusPillClass(status) {
  switch (status) {
    case 'confirmed': return 'pill-success';
    case 'canceled': return 'pill-muted';
    case 'scheduled': return 'pill-patient';
    default: return '';
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
          <div class="title">${escapeHtml(a.appointmentDate)} at ${formatTime(a.appointmentTime)}</div>
          <div class="muted">Counselor: ${escapeHtml(counselorName)}</div>
        </div>
        <span class="pill ${getStatusPillClass(a.status)}">${escapeHtml(a.status)}</span>
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

    // Check for pre-selected counselor from URL
    const full = getRoute();
    const [, query] = full.split('?');
    const params = new URLSearchParams(query || '');
    const preselectedCounselorId = params.get('counselor');

    const [counselors, myAppointments] = await Promise.all([
      api('/patient/counselors'),
      api('/patient/appointments'),
    ]);

    const counselorOptions = counselors
      .map((c) => {
        const base = c.name || c.email;
        const specialty = c.specialty ? ` (${c.specialty})` : '';
        const selected = String(c.id) === preselectedCounselorId ? 'selected' : '';
        return `<option value="${c.id}" ${selected}>${escapeHtml(base + specialty)}</option>`;
      })
      .join('');

    renderMain(`
      <div class="card">
        <h2>Book Appointment</h2>
        <p class="muted">Select a counselor, check their availability, and book your session.</p>
        
        <div class="grid-2">
          <div class="field">
            <label>Select Counselor</label>
            <select id="ap-counselor">${counselorOptions}</select>
          </div>
          <div class="field">
            <label>Date</label>
            <input id="ap-date" type="date" />
          </div>
        </div>
        
        <div class="actions">
          <button class="btn-secondary" id="btn-check">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Check Availability
          </button>
        </div>
        
        <div id="ap-availability"></div>
        
        <div class="field" id="time-field" style="display:none;">
          <label>Select Time</label>
          <input id="ap-time" type="time" />
        </div>
        
        <div class="actions" id="book-actions" style="display:none;">
          <button id="btn-book" class="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Book Appointment
          </button>
        </div>
      </div>

      <h2>My Appointments</h2>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${myAppointments.length}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${myAppointments.filter(a => a.status === 'scheduled').length}</div>
          <div class="stat-label">Scheduled</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${myAppointments.filter(a => a.status === 'confirmed').length}</div>
          <div class="stat-label">Confirmed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${myAppointments.filter(a => a.status === 'canceled').length}</div>
          <div class="stat-label">Canceled</div>
        </div>
      </div>
      
      <div class="card">
        <div class="search-bar">
          <div class="field">
            <label>Search</label>
            <input id="ap-search" type="text" placeholder="Search counselor, date..." />
          </div>
          <div class="field">
            <label>Status</label>
            <select id="ap-status">
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          <div class="field">
            <button class="btn-secondary" id="ap-clear">Clear</button>
          </div>
        </div>
      </div>
      <div id="ap-list"></div>
    `);

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('ap-date').value = today;

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

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <h3>No appointments found</h3>
            <p>Book your first appointment above!</p>
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.map(appointmentCard).join('');
      }
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
        
        if (!slots || slots.length === 0) {
          document.getElementById('ap-availability').innerHTML = `
            <div class="card" style="margin-top:1rem; background: rgba(252, 129, 129, 0.1); border-color: rgba(252, 129, 129, 0.3);">
              <h3>No Availability</h3>
              <p class="muted">This counselor is not available on ${toDayName(dow)}. Try a different date.</p>
            </div>
          `;
          document.getElementById('time-field').style.display = 'none';
          document.getElementById('book-actions').style.display = 'none';
        } else {
          const html = slots
            .map((s) => `
              <div class="avail-row">
                <div>
                  <strong>${toDayName(s.dayOfWeek)}</strong>
                  <span class="muted">${formatTime(s.startTime)} - ${formatTime(s.endTime)}</span>
                </div>
                <button class="btn-secondary" data-select-slot="${s.startTime}">Select</button>
              </div>
            `)
            .join('');
          
          document.getElementById('ap-availability').innerHTML = `
            <div class="card" style="margin-top:1rem; background: rgba(104, 211, 145, 0.1); border-color: rgba(104, 211, 145, 0.3);">
              <h3>Available Slots</h3>
              <p class="muted">Click a slot to pre-fill the time, or enter a custom time.</p>
              <div class="avail-list">${html}</div>
            </div>
          `;
          
          document.getElementById('time-field').style.display = 'block';
          document.getElementById('book-actions').style.display = 'flex';
          
          // Bind slot selection
          document.querySelectorAll('[data-select-slot]').forEach(btn => {
            btn.addEventListener('click', () => {
              const time = btn.getAttribute('data-select-slot');
              document.getElementById('ap-time').value = time;
            });
          });
        }
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
        toast('Appointment booked successfully!', 'success');
        await loadPatientAppointments();
      } catch (e) {
        renderError(e);
      }
    });

    // If counselor was pre-selected, automatically check availability
    if (preselectedCounselorId && document.getElementById('ap-date').value) {
      document.getElementById('btn-check').click();
    }
  } catch (e) {
    renderError(e);
  }
}
