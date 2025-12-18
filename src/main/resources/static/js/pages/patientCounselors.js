import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast, toDayOfWeekInt } from '../ui.js';
import { navigate } from '../router.js';

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

function getTodayDayOfWeek() {
  return new Date().getDay();
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export async function loadPatientCounselors() {
  try {
    requireRole(state.me, 'patient');

    // Fetch all counselors
    const counselors = await api('/patient/counselors');
    
    // Fetch availability for each counselor
    const counselorData = await Promise.all(
      counselors.map(async (c) => {
        try {
          const availability = await api(`/patient/counselors/${c.id}/availability`);
          return { ...c, availability: availability || [] };
        } catch (e) {
          return { ...c, availability: [] };
        }
      })
    );

    const todayDow = getTodayDayOfWeek();

    renderMain(`
      <div class="card">
        <h2>Find Counselors</h2>
        <p class="muted">Browse counselors, check their availability, and book appointments.</p>
      </div>

      <div class="card">
        <div class="search-bar">
          <div class="field">
            <label>Search</label>
            <input id="counselor-search" type="text" placeholder="Search by name, specialty..." />
          </div>
          <div class="field">
            <label>Specialty</label>
            <select id="counselor-specialty">
              <option value="all">All Specialties</option>
            </select>
          </div>
          <div class="field">
            <label>Availability</label>
            <select id="counselor-availability">
              <option value="all">Any Day</option>
              <option value="today">Available Today</option>
              <option value="unavailable">Unavailable Today</option>
            </select>
          </div>
          <div class="field">
            <button class="btn-secondary" id="counselor-clear">Clear Filters</button>
          </div>
        </div>
      </div>

      <div class="stats-grid" id="counselor-stats"></div>

      <div id="counselor-list" class="grid-3"></div>
    `);

    // Populate specialty dropdown with unique specialties
    const specialties = [...new Set(counselorData.map(c => c.specialty).filter(Boolean))];
    const specialtySelect = document.getElementById('counselor-specialty');
    specialties.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      specialtySelect.appendChild(opt);
    });

    const listEl = document.getElementById('counselor-list');
    const statsEl = document.getElementById('counselor-stats');
    const searchEl = document.getElementById('counselor-search');
    const specialtyEl = document.getElementById('counselor-specialty');
    const availabilityEl = document.getElementById('counselor-availability');
    const clearEl = document.getElementById('counselor-clear');

    const isAvailableToday = (c) => {
      return c.availability.some(a => Number(a.dayOfWeek) === todayDow);
    };

    const counselorCard = (c) => {
      const availableToday = isAvailableToday(c);
      const availabilityPill = availableToday 
        ? '<span class="pill pill-available">Available Today</span>'
        : '<span class="pill pill-unavailable">Unavailable Today</span>';

      // Group availability by day
      const slotsByDay = {};
      c.availability.forEach(a => {
        const day = Number(a.dayOfWeek);
        if (!slotsByDay[day]) slotsByDay[day] = [];
        slotsByDay[day].push(a);
      });

      const availabilityHtml = Object.keys(slotsByDay).length > 0
        ? Object.entries(slotsByDay)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([day, slots]) => {
              const isToday = Number(day) === todayDow;
              return `
                <div class="slot-day ${isToday ? 'slot-today' : ''}">
                  <strong>${toDayName(day)}${isToday ? ' (Today)' : ''}</strong>
                  <div class="counselor-slots">
                    ${slots.map(s => `<span class="slot-badge">${formatTime(s.startTime)} - ${formatTime(s.endTime)}</span>`).join('')}
                  </div>
                </div>
              `;
            }).join('')
        : '<p class="muted">No availability set</p>';

      return `
        <div class="counselor-card">
          <div class="counselor-header">
            <div class="counselor-info">
              <h3>${escapeHtml(c.name || c.email)}</h3>
              ${c.specialty ? `<div class="counselor-specialty">${escapeHtml(c.specialty)}</div>` : ''}
            </div>
            ${availabilityPill}
          </div>
          <div class="counselor-availability">
            <h4>Weekly Availability</h4>
            ${availabilityHtml}
          </div>
          <div class="actions">
            <button class="btn-primary" data-book-counselor="${c.id}">Book Appointment</button>
            <button class="btn-secondary" data-view-counselor="${c.id}">View Details</button>
          </div>
        </div>
      `;
    };

    const updateStats = (filtered) => {
      const availableCount = filtered.filter(isAvailableToday).length;
      const unavailableCount = filtered.length - availableCount;
      
      statsEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${filtered.length}</div>
          <div class="stat-label">Total Counselors</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${availableCount}</div>
          <div class="stat-label">Available Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${unavailableCount}</div>
          <div class="stat-label">Unavailable Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${specialties.length}</div>
          <div class="stat-label">Specialties</div>
        </div>
      `;
    };

    const bindActions = () => {
      document.querySelectorAll('[data-book-counselor]').forEach(btn => {
        btn.addEventListener('click', () => {
          const counselorId = btn.getAttribute('data-book-counselor');
          // Navigate to appointments page with counselor pre-selected
          navigate(`/appointments?counselor=${counselorId}`);
        });
      });

      document.querySelectorAll('[data-view-counselor]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const counselorId = btn.getAttribute('data-view-counselor');
          const counselor = counselorData.find(c => String(c.id) === counselorId);
          if (!counselor) return;

          // Show detailed modal/card
          const modal = document.createElement('div');
          modal.className = 'modal-overlay';
          modal.innerHTML = `
            <div class="modal-content card">
              <div class="row-between">
                <h2>${escapeHtml(counselor.name || counselor.email)}</h2>
                <button class="btn-ghost modal-close">&times;</button>
              </div>
              ${counselor.specialty ? `<p class="muted">${escapeHtml(counselor.specialty)}</p>` : ''}
              <h3>Contact</h3>
              <p>${escapeHtml(counselor.email)}</p>
              <h3>Availability</h3>
              ${counselor.availability.length > 0 
                ? counselor.availability.map(a => `
                    <div class="avail-row">
                      <div>
                        <strong>${toDayName(a.dayOfWeek)}</strong>
                        <span class="muted">${formatTime(a.startTime)} - ${formatTime(a.endTime)}</span>
                      </div>
                    </div>
                  `).join('')
                : '<p class="muted">No availability configured</p>'
              }
              <div class="actions">
                <button class="btn-primary" data-modal-book="${counselor.id}">Book Appointment</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);

          modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
          modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
          });
          modal.querySelector('[data-modal-book]').addEventListener('click', () => {
            modal.remove();
            navigate(`/appointments?counselor=${counselor.id}`);
          });
        });
      });
    };

    const renderCounselors = () => {
      const query = searchEl.value.toLowerCase().trim();
      const specialty = specialtyEl.value;
      const availability = availabilityEl.value;

      let filtered = counselorData.filter(c => {
        // Text search
        if (query) {
          const haystack = `${c.name || ''} ${c.email || ''} ${c.specialty || ''}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }

        // Specialty filter
        if (specialty !== 'all' && c.specialty !== specialty) return false;

        // Availability filter
        if (availability === 'today' && !isAvailableToday(c)) return false;
        if (availability === 'unavailable' && isAvailableToday(c)) return false;

        return true;
      });

      updateStats(filtered);

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h3>No counselors found</h3>
            <p>Try adjusting your search filters</p>
          </div>
        `;
      } else {
        listEl.innerHTML = filtered.map(counselorCard).join('');
      }

      bindActions();
    };

    searchEl.addEventListener('input', renderCounselors);
    specialtyEl.addEventListener('change', renderCounselors);
    availabilityEl.addEventListener('change', renderCounselors);
    clearEl.addEventListener('click', () => {
      searchEl.value = '';
      specialtyEl.value = 'all';
      availabilityEl.value = 'all';
      renderCounselors();
    });

    renderCounselors();
  } catch (e) {
    renderError(e);
  }
}

