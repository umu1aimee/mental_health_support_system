import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast } from '../ui.js';

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

function parseTimeToMinutes(t) {
  if (!t || typeof t !== 'string' || !t.includes(':')) return NaN;
  const [hh, mm] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;
  return hh * 60 + mm;
}

function normalizeSlot(slot) {
  return {
    dayOfWeek: Number(slot.dayOfWeek),
    startTime: String(slot.startTime),
    endTime: String(slot.endTime),
  };
}

function sortSlots(slots) {
  return (slots || [])
    .map(normalizeSlot)
    .filter((s) => Number.isFinite(s.dayOfWeek) && s.dayOfWeek >= 0 && s.dayOfWeek <= 6)
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });
}

function slotKey(s) {
  return `${s.dayOfWeek}|${s.startTime}|${s.endTime}`;
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export async function loadCounselorAvailability() {
  try {
    requireRole(state.me, 'counselor');

    const availability = await api('/counselor/availability');
    let draftSlots = sortSlots(availability);

    const renderSlots = () => {
      // Group slots by day
      const slotsByDay = {};
      for (let i = 0; i < 7; i++) {
        slotsByDay[i] = [];
      }
      draftSlots.forEach(s => {
        slotsByDay[s.dayOfWeek].push(s);
      });

      return Object.entries(slotsByDay)
        .map(([day, slots]) => {
          const dayNum = Number(day);
          const slotsHtml = slots.length > 0
            ? slots.map(s => `
                <div class="avail-slot">
                  <span>${formatTime(s.startTime)} - ${formatTime(s.endTime)}</span>
                  <button class="btn-danger btn-sm" data-remove-slot="${escapeHtml(slotKey(s))}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              `).join('')
            : '<span class="muted">No slots</span>';

          return `
            <div class="day-column ${slots.length > 0 ? 'has-slots' : ''}">
              <div class="day-header">
                <strong>${toDayName(dayNum)}</strong>
                <span class="pill ${slots.length > 0 ? 'pill-success' : 'pill-muted'}">${slots.length} slot${slots.length !== 1 ? 's' : ''}</span>
              </div>
              <div class="day-slots">
                ${slotsHtml}
              </div>
              <button class="btn-secondary btn-add-day" data-add-day="${dayNum}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add
              </button>
            </div>
          `;
        }).join('');
    };

    const render = () => {
      renderMain(`
        <div class="card">
          <h2>Manage Availability</h2>
          <p class="muted">Set your weekly availability so patients can book appointments with you.</p>
        </div>

        <div class="card">
          <h3>Quick Add</h3>
          <p class="muted">Add a time slot to your schedule. Select a date to set the day of week.</p>
          <div class="grid-3">
            <div class="field">
              <label>Date (for day of week)</label>
              <input id="avail-date" type="date" />
            </div>
            <div class="field">
              <label>Start Time</label>
              <input id="avail-start" type="time" />
            </div>
            <div class="field">
              <label>End Time</label>
              <input id="avail-end" type="time" />
            </div>
          </div>
          <div class="actions">
            <button id="btn-add-slot" class="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Slot
            </button>
          </div>
        </div>

        <div class="card">
          <div class="row-between">
            <h3>Weekly Schedule</h3>
            <div class="actions" style="margin:0">
              <button class="btn-secondary" id="btn-reset">Reset Changes</button>
              <button class="btn-primary" id="btn-save">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Availability
              </button>
            </div>
          </div>
          <div class="week-grid" id="week-grid">
            ${renderSlots()}
          </div>
        </div>

        <div class="card">
          <h3>Tips</h3>
          <ul class="tips-list">
            <li>Patients can see your availability when booking appointments</li>
            <li>Set consistent weekly hours for better scheduling</li>
            <li>Remember to update your availability if your schedule changes</li>
            <li>Consider leaving buffer time between appointments</li>
          </ul>
        </div>
      `);

      bindEvents();
    };

    const bindEvents = () => {
      // Add slot button
      document.getElementById('btn-add-slot').addEventListener('click', () => {
        try {
          const dateStr = document.getElementById('avail-date').value;
          const startTime = document.getElementById('avail-start').value;
          const endTime = document.getElementById('avail-end').value;

          if (!dateStr) throw new Error('Select a date');
          if (!startTime) throw new Error('Select a start time');
          if (!endTime) throw new Error('Select an end time');

          const s = parseTimeToMinutes(startTime);
          const e = parseTimeToMinutes(endTime);
          if (!Number.isFinite(s) || !Number.isFinite(e) || s >= e) {
            throw new Error('End time must be after start time');
          }

          const dow = new Date(dateStr + 'T00:00:00').getDay();
          const slot = normalizeSlot({ dayOfWeek: dow, startTime, endTime });
          const key = slotKey(slot);
          if (draftSlots.some((x) => slotKey(x) === key)) {
            throw new Error('This slot is already added');
          }

          draftSlots = sortSlots([...draftSlots, slot]);
          document.getElementById('avail-date').value = '';
          document.getElementById('avail-start').value = '';
          document.getElementById('avail-end').value = '';
          updateWeekGrid();
          toast('Slot added (remember to save)', 'success');
        } catch (e) {
          toast(e.message, 'error');
        }
      });

      // Save button
      document.getElementById('btn-save').addEventListener('click', async () => {
        try {
          await api('/counselor/availability', { method: 'PUT', body: draftSlots });
          toast('Availability saved successfully!', 'success');
        } catch (e) {
          renderError(e);
        }
      });

      // Reset button
      document.getElementById('btn-reset').addEventListener('click', async () => {
        const fresh = await api('/counselor/availability');
        draftSlots = sortSlots(fresh);
        updateWeekGrid();
        toast('Changes reset', 'success');
      });

      // Bind remove buttons and add-day buttons
      bindSlotActions();
    };

    const bindSlotActions = () => {
      document.querySelectorAll('[data-remove-slot]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-remove-slot');
          draftSlots = draftSlots.filter(s => slotKey(s) !== key);
          updateWeekGrid();
          toast('Slot removed (remember to save)', 'success');
        });
      });

      document.querySelectorAll('[data-add-day]').forEach(btn => {
        btn.addEventListener('click', () => {
          const dayOfWeek = parseInt(btn.getAttribute('data-add-day'), 10);
          // Pre-fill the date input with a date that matches this day of week
          const today = new Date();
          const currentDay = today.getDay();
          const diff = dayOfWeek - currentDay;
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + diff + (diff < 0 ? 7 : 0));
          
          const dateStr = targetDate.toISOString().split('T')[0];
          document.getElementById('avail-date').value = dateStr;
          document.getElementById('avail-start').focus();
        });
      });
    };

    const updateWeekGrid = () => {
      const grid = document.getElementById('week-grid');
      if (grid) {
        grid.innerHTML = renderSlots();
        bindSlotActions();
      }
    };

    render();
  } catch (e) {
    renderError(e);
  }
}

