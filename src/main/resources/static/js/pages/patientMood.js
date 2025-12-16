import { api } from '../api.js';
import { state } from '../state.js';
import { renderMain, renderError, requireRole, toast } from '../ui.js';
import { moodChart } from '../components.js';

export async function loadPatientMood() {
  try {
    requireRole(state.me, 'patient');

    const history = await api('/patient/mood');

    renderMain(`
      <div class="card">
        <h2>Mood Tracker</h2>
        <div class="grid-3">
          <div class="field">
            <label>Date</label>
            <input id="mood-date" type="date" />
          </div>
          <div class="field">
            <label>Rating (1-10)</label>
            <input id="mood-rating" type="number" min="1" max="10" value="5" />
          </div>
        </div>
        <div class="field">
          <label>Notes (optional)</label>
          <textarea id="mood-notes" rows="3"></textarea>
        </div>
        <div class="actions">
          <button id="btn-save-mood">Save</button>
        </div>
      </div>
      ${moodChart(history)}
    `);

    // Default the date to today for convenience
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('mood-date');
    if (dateEl && !dateEl.value) {
      dateEl.value = today;
    }

    document.getElementById('btn-save-mood').addEventListener('click', async () => {
      try {
        const entryDate = document.getElementById('mood-date').value || today;
        const ratingRaw = document.getElementById('mood-rating').value;
        const rating = Number(ratingRaw);
        const notes = document.getElementById('mood-notes').value;
        if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
          throw new Error('Rating must be between 1 and 10');
        }
        await api('/patient/mood', { method: 'POST', body: { entryDate, rating, notes } });
        toast('Mood saved', 'success');
        await loadPatientMood();
      } catch (e) {
        renderError(e);
      }
    });
  } catch (e) {
    renderError(e);
  }
}
