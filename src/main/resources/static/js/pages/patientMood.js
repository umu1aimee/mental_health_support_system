import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole, toast } from '../ui.js';

function getMoodEmoji(rating) {
  if (rating <= 2) return '😢';
  if (rating <= 4) return '😕';
  if (rating <= 6) return '😐';
  if (rating <= 8) return '🙂';
  return '😊';
}

function getMoodLabel(rating) {
  if (rating <= 2) return 'Very Low';
  if (rating <= 4) return 'Low';
  if (rating <= 6) return 'Neutral';
  if (rating <= 8) return 'Good';
  return 'Excellent';
}

function getMoodColor(rating) {
  if (rating <= 2) return '#fc8181';
  if (rating <= 4) return '#f6ad55';
  if (rating <= 6) return '#faf089';
  if (rating <= 8) return '#68d391';
  return '#48bb78';
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function calculateStats(entries) {
  if (!entries || entries.length === 0) {
    return { avg: 0, highest: 0, lowest: 0, trend: 'neutral' };
  }
  
  const ratings = entries.map(e => e.rating);
  const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  const highest = Math.max(...ratings);
  const lowest = Math.min(...ratings);
  
  // Calculate trend (compare last 3 entries to previous 3)
  let trend = 'neutral';
  if (entries.length >= 6) {
    const recent = entries.slice(-3).map(e => e.rating);
    const previous = entries.slice(-6, -3).map(e => e.rating);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / 3;
    const prevAvg = previous.reduce((a, b) => a + b, 0) / 3;
    if (recentAvg > prevAvg + 0.5) trend = 'up';
    else if (recentAvg < prevAvg - 0.5) trend = 'down';
  }
  
  return { avg, highest, lowest, trend };
}

function renderMoodChart(entries) {
  if (!entries || entries.length === 0) {
    return `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
        <h3>No mood entries yet</h3>
        <p>Start tracking your mood to see your history here!</p>
      </div>
    `;
  }

  const recentEntries = entries.slice(-14); // Show last 14 entries
  
  const bars = recentEntries.map((e) => {
    const rating = Math.max(0, Math.min(10, Number(e.rating || 0)));
    const height = rating * 10;
    const color = getMoodColor(rating);
    return `
      <div class="chart-bar-container" title="${formatDate(e.entryDate)}: ${rating}/10 ${getMoodEmoji(rating)}">
        <div class="chart-bar" style="height: ${height}%; background: ${color};"></div>
        <div class="chart-label">${e.entryDate.split('-')[2]}</div>
      </div>
    `;
  }).join('');

  const list = entries.slice().reverse().slice(0, 10).map((e) => {
    const rating = Math.max(0, Math.min(10, Number(e.rating || 0)));
    const w = rating * 10;
    return `
      <div class="mood-entry">
        <div class="mood-entry-header">
          <div class="mood-entry-date">
            <span class="mood-emoji">${getMoodEmoji(rating)}</span>
            <span>${formatDate(e.entryDate)}</span>
          </div>
          <div class="mood-entry-rating">
            <strong>${rating}</strong>/10
            <span class="mood-label" style="color: ${getMoodColor(rating)}">${getMoodLabel(rating)}</span>
          </div>
        </div>
        <div class="mood-bar">
          <div class="mood-bar-fill" style="width:${w}%; background: ${getMoodColor(rating)}"></div>
        </div>
        ${e.notes ? `<div class="mood-notes">${escapeHtml(e.notes)}</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <h3>Mood Trend (Last 14 Days)</h3>
      <div class="mood-chart">
        ${bars}
      </div>
    </div>
    <div class="card">
      <h3>Recent Entries</h3>
      <div class="mood-list">
        ${list}
      </div>
    </div>
  `;
}

export async function loadPatientMood() {
  try {
    requireRole(state.me, 'patient');

    const history = await api('/patient/mood');
    const stats = calculateStats(history);

    const trendIcon = stats.trend === 'up' 
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#48bb78" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>'
      : stats.trend === 'down'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fc8181" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#faf089" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

    renderMain(`
      <div class="card">
        <h2>Mood Tracker</h2>
        <p class="muted">Track your daily mood to identify patterns and monitor your mental wellness journey.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${history.length}</div>
          <div class="stat-label">Total Entries</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.avg}</div>
          <div class="stat-label">Average Mood</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.highest}</div>
          <div class="stat-label">Highest</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            ${trendIcon}
          </div>
          <div class="stat-label">Trend</div>
        </div>
      </div>

      <div class="card">
        <h3>Log Today's Mood</h3>
        <div class="mood-input-section">
          <div class="grid-3">
            <div class="field">
              <label>Date</label>
              <input id="mood-date" type="date" />
            </div>
            <div class="field">
              <label>How are you feeling? (1-10)</label>
              <div class="mood-slider-container">
                <input id="mood-rating" type="range" min="1" max="10" value="5" class="mood-slider" />
                <div class="mood-display">
                  <span id="mood-emoji" class="mood-emoji-large">😐</span>
                  <span id="mood-value">5</span>/10
                </div>
              </div>
            </div>
          </div>
          <div class="field">
            <label>Notes (optional)</label>
            <textarea id="mood-notes" rows="3" placeholder="What's on your mind today?"></textarea>
          </div>
          <div class="actions">
            <button id="btn-save-mood" class="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save Mood Entry
            </button>
          </div>
        </div>
      </div>

      ${renderMoodChart(history)}
    `);

    // Default the date to today
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('mood-date');
    if (dateEl && !dateEl.value) {
      dateEl.value = today;
    }

    // Setup mood slider
    const ratingSlider = document.getElementById('mood-rating');
    const moodEmoji = document.getElementById('mood-emoji');
    const moodValue = document.getElementById('mood-value');

    const updateMoodDisplay = () => {
      const val = parseInt(ratingSlider.value, 10);
      moodValue.textContent = val;
      moodEmoji.textContent = getMoodEmoji(val);
    };

    ratingSlider.addEventListener('input', updateMoodDisplay);
    updateMoodDisplay();

    document.getElementById('btn-save-mood').addEventListener('click', async () => {
      try {
        const entryDate = document.getElementById('mood-date').value || today;
        const rating = Number(ratingSlider.value);
        const notes = document.getElementById('mood-notes').value;
        if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
          throw new Error('Rating must be between 1 and 10');
        }
        await api('/patient/mood', { method: 'POST', body: { entryDate, rating, notes } });
        toast('Mood saved successfully!', 'success');
        await loadPatientMood();
      } catch (e) {
        renderError(e);
      }
    });
  } catch (e) {
    renderError(e);
  }
}
