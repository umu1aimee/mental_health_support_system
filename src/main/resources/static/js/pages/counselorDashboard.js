import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast } from '../ui.js';
import { moodChart } from '../components.js';
import { navigate } from '../router.js';

function includesText(haystack, needle) {
  const h = (haystack ?? '').toString().toLowerCase();
  const n = (needle ?? '').toString().trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

function toDayName(dayOfWeek) {
  switch (Number(dayOfWeek)) {
    case 0: return 'Sun';
    case 1: return 'Mon';
    case 2: return 'Tue';
    case 3: return 'Wed';
    case 4: return 'Thu';
    case 5: return 'Fri';
    case 6: return 'Sat';
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

function patientCard(p) {
  const u = p.user || {};
  return `
    <div class="card">
      <div class="row-between">
        <div>
          <div class="title">${escapeHtml(u.name || u.email)}</div>
          <div class="muted">${escapeHtml(u.email || '')}</div>
          ${p.emergencyContact ? `<div class="muted">Emergency: ${escapeHtml(p.emergencyContact)}</div>` : ''}
        </div>
        <button class="btn-secondary" data-mood-patient="${p.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
          View Mood
        </button>
      </div>
    </div>
  `;
}

export async function loadCounselorDashboard() {
  try {
    requireRole(state.me, 'counselor');

    const [patients, availability, appointments] = await Promise.all([
      api('/counselor/patients'),
      api('/counselor/availability'),
      api('/counselor/appointments'),
    ]);

    // Calculate stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.appointmentDate === todayStr);
    const upcomingAppointments = appointments.filter(a => a.appointmentDate >= todayStr && a.status !== 'canceled');
    const totalSlots = availability.length;

    // Group availability by day for display
    const slotsByDay = {};
    availability.forEach(a => {
      const day = Number(a.dayOfWeek);
      if (!slotsByDay[day]) slotsByDay[day] = [];
      slotsByDay[day].push(a);
    });

    const availabilitySummary = Object.entries(slotsByDay)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([day, slots]) => `
        <div class="avail-day-badge">
          <strong>${toDayName(day)}</strong>
          <span class="muted">${slots.length} slot${slots.length !== 1 ? 's' : ''}</span>
        </div>
      `).join('') || '<span class="muted">No availability set</span>';

    // Recent appointments
    const recentAppointments = appointments
      .filter(a => a.status !== 'canceled')
      .slice(0, 5)
      .map(a => {
        const patientName = a.patient ? (a.patient.name || a.patient.email) : 'Unknown';
        return `
          <div class="appointment-row">
            <div>
              <div class="title">${escapeHtml(a.appointmentDate)} at ${formatTime(a.appointmentTime)}</div>
              <div class="muted">${escapeHtml(patientName)}</div>
            </div>
            <span class="pill ${getStatusPillClass(a.status)}">${escapeHtml(a.status)}</span>
          </div>
        `;
      }).join('') || '<p class="muted">No upcoming appointments</p>';

    renderMain(`
      <div class="card">
        <h2>Welcome back, ${escapeHtml(state.me.name || 'Counselor')}</h2>
        <p class="muted">Here's an overview of your practice.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${patients.length}</div>
          <div class="stat-label">Patients</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${todayAppointments.length}</div>
          <div class="stat-label">Today's Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${upcomingAppointments.length}</div>
          <div class="stat-label">Upcoming</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalSlots}</div>
          <div class="stat-label">Weekly Slots</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="row-between">
            <h3>My Availability</h3>
            <button class="btn-secondary" id="btn-manage-avail">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Manage
            </button>
          </div>
          <div class="avail-summary">
            ${availabilitySummary}
          </div>
          <p class="hint">Patients can book appointments during your available slots.</p>
        </div>

        <div class="card">
          <div class="row-between">
            <h3>Recent Appointments</h3>
            <button class="btn-secondary" id="btn-view-appts">View All</button>
          </div>
          <div class="appointment-list">
            ${recentAppointments}
          </div>
        </div>
      </div>

      <h2>My Patients</h2>
      <div class="card">
        <div class="search-bar">
          <div class="field">
            <label>Search</label>
            <input id="patient-search" type="text" placeholder="Search by name, email..." />
          </div>
          <div class="field">
            <button class="btn-secondary" id="patient-clear">Clear</button>
          </div>
        </div>
      </div>
      <div id="patient-list"></div>

      <div id="counselor-mood"></div>
    `);

    // Bind navigation buttons
    document.getElementById('btn-manage-avail').addEventListener('click', () => {
      navigate('/counselor-availability');
    });

    document.getElementById('btn-view-appts').addEventListener('click', () => {
      navigate('/counselor-appointments');
    });

    const allPatients = patients || [];
    const listEl = document.getElementById('patient-list');
    const qEl = document.getElementById('patient-search');
    const clearEl = document.getElementById('patient-clear');

    const bindMoodButtons = () => {
      document.querySelectorAll('#patient-list [data-mood-patient]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            const patientId = btn.getAttribute('data-mood-patient');
            const mood = await api(`/counselor/patients/${patientId}/mood`);
            document.getElementById('counselor-mood').innerHTML = moodChart(mood);
          } catch (e) {
            renderError(e);
          }
        });
      });
    };

    const renderPatients = () => {
      const q = qEl.value;
      const filtered = allPatients.filter((p) => {
        const u = p.user || {};
        const haystack = `${u.name || ''} ${u.email || ''} ${p.emergencyContact || ''}`;
        return includesText(haystack, q);
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h3>No patients found</h3>
            <p>Patients will appear here once they're assigned to you.</p>
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.map(patientCard).join('');
      }
      bindMoodButtons();
    };

    qEl.addEventListener('input', renderPatients);
    clearEl.addEventListener('click', () => {
      qEl.value = '';
      renderPatients();
    });

    renderPatients();
  } catch (e) {
    renderError(e);
  }
}
