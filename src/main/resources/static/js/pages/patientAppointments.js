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

function toDayNameShort(dayOfWeek) {
  switch (Number(dayOfWeek)) {
    case 0: return 'Sun';
    case 1: return 'Mon';
    case 2: return 'Tue';
    case 3: return 'Wed';
    case 4: return 'Thu';
    case 5: return 'Fri';
    case 6: return 'Sat';
    default: return `D${dayOfWeek}`;
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

    // Fetch availability for all counselors
    const counselorsWithAvailability = await Promise.all(
      counselors.map(async (c) => {
        try {
          const availability = await api(`/patient/counselors/${c.id}/availability`);
          return { ...c, availability: availability || [] };
        } catch (e) {
          return { ...c, availability: [] };
        }
      })
    );

    const todayDow = new Date().getDay();

    // Build counselor cards with availability
    const counselorCards = counselorsWithAvailability.map((c) => {
      const isAvailableToday = c.availability.some(a => Number(a.dayOfWeek) === todayDow);
      const availabilityBadge = isAvailableToday 
        ? '<span class="pill pill-available">Available Today</span>'
        : '<span class="pill pill-unavailable">Not Available Today</span>';

      // Group availability by day
      const slotsByDay = {};
      c.availability.forEach(a => {
        const day = Number(a.dayOfWeek);
        if (!slotsByDay[day]) slotsByDay[day] = [];
        slotsByDay[day].push(a);
      });

      // Create weekly availability display
      const weekDays = [0, 1, 2, 3, 4, 5, 6].map(day => {
        const slots = slotsByDay[day] || [];
        const isToday = day === todayDow;
        const hasSlots = slots.length > 0;
        
        return `
          <div class="week-day ${isToday ? 'today' : ''} ${hasSlots ? 'available' : 'unavailable'}">
            <div class="week-day-name">${toDayNameShort(day)}</div>
            ${hasSlots 
              ? slots.map(s => `<div class="week-day-time">${formatTime(s.startTime)}</div>`).join('')
              : '<div class="week-day-time">-</div>'
            }
          </div>
        `;
      }).join('');

      return `
        <div class="counselor-select-card ${preselectedCounselorId === String(c.id) ? 'selected' : ''}" data-counselor-id="${c.id}">
          <div class="counselor-select-header">
            <div>
              <div class="counselor-name">${escapeHtml(c.name || c.email)}</div>
              ${c.specialty ? `<div class="counselor-specialty">${escapeHtml(c.specialty)}</div>` : '<div class="counselor-specialty muted">General Counseling</div>'}
            </div>
            ${availabilityBadge}
          </div>
          <div class="counselor-week-schedule">
            ${weekDays}
          </div>
          <button class="btn-primary btn-select-counselor" data-select-counselor="${c.id}">
            Select This Counselor
          </button>
        </div>
      `;
    }).join('');

    renderMain(`
      <div class="card">
        <h2>Book Appointment</h2>
        <p class="muted">Select a counselor based on their specialty and availability, then book your session.</p>
      </div>

      <h3>Choose a Counselor</h3>
      <div class="counselor-select-grid">
        ${counselorCards || '<p class="muted">No counselors available</p>'}
      </div>

      <div id="booking-section" style="display: none;">
        <div class="card booking-card">
          <h3>Book with <span id="selected-counselor-name"></span></h3>
          <p class="muted" id="selected-counselor-specialty"></p>
          
          <div class="grid-2">
            <div class="field">
              <label>Select Date</label>
              <input id="ap-date" type="date" />
            </div>
            <div class="field">
              <label>Select Time</label>
              <input id="ap-time" type="time" />
            </div>
          </div>
          
          <div id="ap-availability"></div>
          
          <div class="actions">
            <button id="btn-book" class="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Book Appointment
            </button>
            <button id="btn-cancel-select" class="btn-secondary">Choose Different Counselor</button>
          </div>
          <input type="hidden" id="selected-counselor-id" />
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

    let selectedCounselor = null;

    const showBookingSection = (counselorId) => {
      const counselor = counselorsWithAvailability.find(c => String(c.id) === String(counselorId));
      if (!counselor) return;

      selectedCounselor = counselor;
      document.getElementById('selected-counselor-id').value = counselor.id;
      document.getElementById('selected-counselor-name').textContent = counselor.name || counselor.email;
      document.getElementById('selected-counselor-specialty').textContent = counselor.specialty || 'General Counseling';
      document.getElementById('booking-section').style.display = 'block';
      
      // Highlight selected card
      document.querySelectorAll('.counselor-select-card').forEach(card => {
        card.classList.remove('selected');
      });
      document.querySelector(`[data-counselor-id="${counselorId}"]`)?.classList.add('selected');

      // Show availability for selected date
      updateAvailabilityDisplay();
      
      // Scroll to booking section
      document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' });
    };

    const updateAvailabilityDisplay = () => {
      if (!selectedCounselor) return;
      
      const dateStr = document.getElementById('ap-date').value;
      if (!dateStr) return;
      
      const dow = toDayOfWeekInt(dateStr);
      const daySlots = selectedCounselor.availability.filter(a => Number(a.dayOfWeek) === dow);
      
      const availDiv = document.getElementById('ap-availability');
      
      if (daySlots.length === 0) {
        availDiv.innerHTML = `
          <div class="availability-notice unavailable">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <div>
              <strong>Not Available on ${toDayName(dow)}</strong>
              <p>This counselor doesn't have availability on this day. Please select a different date.</p>
            </div>
          </div>
        `;
      } else {
        const slotsHtml = daySlots.map(s => `
          <button class="time-slot-btn" data-time="${s.startTime}">
            ${formatTime(s.startTime)} - ${formatTime(s.endTime)}
          </button>
        `).join('');
        
        availDiv.innerHTML = `
          <div class="availability-notice available">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div>
              <strong>Available on ${toDayName(dow)}</strong>
              <p>Click a time slot to select it, or enter a custom time.</p>
            </div>
          </div>
          <div class="time-slots">
            ${slotsHtml}
          </div>
        `;
        
        // Bind time slot buttons
        document.querySelectorAll('.time-slot-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.getElementById('ap-time').value = btn.getAttribute('data-time');
            document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
        });
      }
    };

    // Bind counselor selection
    document.querySelectorAll('.btn-select-counselor').forEach(btn => {
      btn.addEventListener('click', () => {
        const counselorId = btn.getAttribute('data-select-counselor');
        showBookingSection(counselorId);
      });
    });

    // Also allow clicking the card itself
    document.querySelectorAll('.counselor-select-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-select-counselor')) return;
        const counselorId = card.getAttribute('data-counselor-id');
        showBookingSection(counselorId);
      });
    });

    // Cancel selection
    document.getElementById('btn-cancel-select').addEventListener('click', () => {
      document.getElementById('booking-section').style.display = 'none';
      selectedCounselor = null;
      document.querySelectorAll('.counselor-select-card').forEach(card => {
        card.classList.remove('selected');
      });
    });

    // Date change updates availability
    document.getElementById('ap-date').addEventListener('change', updateAvailabilityDisplay);

    // Book appointment
    document.getElementById('btn-book').addEventListener('click', async () => {
      try {
        const counselorId = Number(document.getElementById('selected-counselor-id').value);
        const appointmentDate = document.getElementById('ap-date').value;
        const appointmentTime = document.getElementById('ap-time').value;
        
        if (!counselorId) throw new Error('Please select a counselor');
        if (!appointmentDate) throw new Error('Please select a date');
        if (!appointmentTime) throw new Error('Please select a time');
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
        toast(e.message || 'Failed to book appointment', 'error');
      }
    });

    // If counselor was pre-selected, show booking section
    if (preselectedCounselorId) {
      showBookingSection(preselectedCounselorId);
    }

    // Appointment list functionality
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
  } catch (e) {
    renderError(e);
  }
}
