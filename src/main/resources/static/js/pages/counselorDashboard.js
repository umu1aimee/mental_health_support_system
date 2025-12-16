import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast } from '../ui.js';
import { moodChart } from '../components.js';

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

function patientCard(p) {
  const u = p.user || {};
  return `
    <div class="card">
      <div class="row-between">
        <div>
          <div class="title">${escapeHtml(u.name || u.email)}</div>
          <div class="muted">Emergency: ${escapeHtml(p.emergencyContact || '')}</div>
        </div>
        <button class="btn-secondary" data-mood-patient="${p.id}">View mood</button>
      </div>
    </div>
  `;
}

export async function loadCounselorDashboard() {
  try {
    requireRole(state.me, 'counselor');

    const [patients, availability] = await Promise.all([
      api('/counselor/patients'),
      api('/counselor/availability'),
    ]);

    let draftSlots = sortSlots(availability);

    const renderAvailabilityEditor = () => {
      const rows = draftSlots.map((a) => {
        const key = slotKey(a);
        return `
          <div class="avail-row">
            <div>
              <div class="title">${escapeHtml(toDayName(a.dayOfWeek))}</div>
              <div class="muted">${escapeHtml(a.startTime)} - ${escapeHtml(a.endTime)}</div>
            </div>
            <button class="btn-danger" data-remove-slot="${escapeHtml(key)}">Remove</button>
          </div>
        `;
      }).join('') || '<div class="muted">No slots added yet.</div>';

      return `
        <div class="card">
          <h3>My availability</h3>
          <p class="muted">Add slots using a date picker. We save them as weekly availability (day of week).</p>

          <div class="grid-3">
            <div class="field">
              <label>Date</label>
              <input id="avail-date" type="date" />
            </div>
            <div class="field">
              <label>Start time</label>
              <input id="avail-start" type="time" />
            </div>
            <div class="field">
              <label>End time</label>
              <input id="avail-end" type="time" />
            </div>
          </div>

          <div class="actions">
            <button id="btn-add-slot">Add slot</button>
            <button class="btn-secondary" id="btn-save-avail">Save availability</button>
            <button class="btn-secondary" id="btn-reset-avail">Reset</button>
          </div>

          <div class="card" style="margin-top:1rem">
            <h4>Current slots</h4>
            <div class="avail-list">${rows}</div>
          </div>
        </div>
      `;
    };

    renderMain(`
      <div class="card">
        <h2>Counselor Dashboard</h2>
        <p class="muted">Manage your availability, appointments, and view assigned patients.</p>
      </div>

      <div id="avail-editor">${renderAvailabilityEditor()}</div>

      <h2>Assigned Patients</h2>
      <div class="card">
        <div class="grid-3">
          <div class="field">
            <label>Search</label>
            <input id="patient-search" type="text" placeholder="Search name, email, emergency" />
          </div>
          <div class="field">
            <label> </label>
            <button class="btn-secondary" id="patient-clear">Clear</button>
          </div>
          <div class="field"></div>
        </div>
      </div>
      <div id="patient-list"></div>

      <div id="counselor-mood"></div>
    `);

    const allPatients = patients || [];
    const listEl = document.getElementById('patient-list');
    const qEl = document.getElementById('patient-search');
    const clearEl = document.getElementById('patient-clear');

    const bindAvailabilityEditor = () => {
      const editor = document.getElementById('avail-editor');
      if (!editor) return;

      const rerender = () => {
        editor.innerHTML = renderAvailabilityEditor();
        bindAvailabilityEditor();
      };

      const btnAdd = document.getElementById('btn-add-slot');
      const btnSave = document.getElementById('btn-save-avail');
      const btnReset = document.getElementById('btn-reset-avail');
      const dateEl = document.getElementById('avail-date');
      const startEl = document.getElementById('avail-start');
      const endEl = document.getElementById('avail-end');

      btnAdd.addEventListener('click', () => {
        try {
          const dateStr = dateEl.value;
          const startTime = startEl.value;
          const endTime = endEl.value;

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
          dateEl.value = '';
          startEl.value = '';
          endEl.value = '';
          rerender();
        } catch (e) {
          renderError(e);
        }
      });

      btnSave.addEventListener('click', async () => {
        try {
          await api('/counselor/availability', { method: 'PUT', body: draftSlots });
          toast('Availability saved', 'success');
          await loadCounselorDashboard();
        } catch (e) {
          renderError(e);
        }
      });

      btnReset.addEventListener('click', () => {
        draftSlots = sortSlots(availability);
        rerender();
      });

      document.querySelectorAll('[data-remove-slot]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-remove-slot');
          draftSlots = draftSlots.filter((s) => slotKey(s) !== key);
          rerender();
        });
      });
    };

    bindAvailabilityEditor();

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

      listEl.innerHTML = filtered.map(patientCard).join('') || '<div class="card">No patients match your search.</div>';
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
