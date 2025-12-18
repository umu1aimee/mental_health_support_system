import { api } from '../api.js';
import { state } from '../state.js';
import { escapeHtml, renderMain, renderError, requireRole } from '../ui.js';
import { navigate } from '../router.js';

function getMoodEmoji(rating) {
  if (rating <= 2) return '😢';
  if (rating <= 4) return '😕';
  if (rating <= 6) return '😐';
  if (rating <= 8) return '🙂';
  return '😊';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export async function loadPatientDashboard() {
  try {
    requireRole(state.me, 'patient');

    // Fetch all data
    const [moodHistory, appointments, counselors] = await Promise.all([
      api('/patient/mood'),
      api('/patient/appointments'),
      api('/patient/counselors'),
    ]);

    // Calculate stats
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingAppts = appointments.filter(a => a.appointmentDate >= todayStr && a.status !== 'canceled');
    const recentMood = moodHistory.length > 0 ? moodHistory[moodHistory.length - 1] : null;
    const avgMood = moodHistory.length > 0 
      ? (moodHistory.reduce((sum, m) => sum + m.rating, 0) / moodHistory.length).toFixed(1)
      : '-';

    // Recent appointments (next 3)
    const nextAppointments = upcomingAppts.slice(0, 3).map(a => {
      const counselorName = a.counselor ? (a.counselor.name || a.counselor.email) : 'Unknown';
      return `
        <div class="appointment-row">
          <div>
            <div class="title">${formatDate(a.appointmentDate)} at ${formatTime(a.appointmentTime)}</div>
            <div class="muted">${escapeHtml(counselorName)}</div>
          </div>
          <span class="pill ${a.status === 'confirmed' ? 'pill-success' : 'pill-patient'}">${escapeHtml(a.status)}</span>
        </div>
      `;
    }).join('') || '<p class="muted">No upcoming appointments</p>';

    // Available counselors today
    const todayDow = new Date().getDay();
    const availableTodayCount = counselors.length; // We'll show all for now

    renderMain(`
      <div class="card">
        <h2>Welcome back, ${escapeHtml(state.me.name || 'Patient')}</h2>
        <p class="muted">Here's your mental health overview.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${recentMood ? getMoodEmoji(recentMood.rating) : '-'}</div>
          <div class="stat-label">Latest Mood</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${avgMood}</div>
          <div class="stat-label">Avg Mood</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${upcomingAppts.length}</div>
          <div class="stat-label">Upcoming</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${counselors.length}</div>
          <div class="stat-label">Counselors</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="row-between">
            <h3>Quick Actions</h3>
          </div>
          <div class="quick-actions">
            <button class="btn-primary" id="btn-log-mood">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
              Log Today's Mood
            </button>
            <button class="btn-secondary" id="btn-book-appt">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Book Appointment
            </button>
            <button class="btn-secondary" id="btn-find-counselor">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              Find Counselors
            </button>
          </div>
        </div>

        <div class="card">
          <div class="row-between">
            <h3>Upcoming Appointments</h3>
            <button class="btn-secondary btn-sm" id="btn-view-appts">View All</button>
          </div>
          <div class="appointment-list">
            ${nextAppointments}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="row-between">
          <h3>Mood Trend (Last 7 Days)</h3>
          <button class="btn-secondary btn-sm" id="btn-view-mood">View History</button>
        </div>
        <div class="mood-mini-chart">
          ${moodHistory.slice(-7).map(m => `
            <div class="mood-mini-bar" title="${formatDate(m.entryDate)}: ${m.rating}/10">
              <div class="mood-mini-fill" style="height: ${m.rating * 10}%"></div>
              <span class="mood-mini-emoji">${getMoodEmoji(m.rating)}</span>
            </div>
          `).join('') || '<p class="muted text-center">No mood entries yet. Start tracking today!</p>'}
        </div>
      </div>

      <div class="card">
        <h3>Mental Health Tips</h3>
        <div class="tips-grid">
          <div class="tip-card">
            <div class="tip-icon">🧘</div>
            <div class="tip-content">
              <strong>Practice Mindfulness</strong>
              <p class="muted">Take 5 minutes to focus on your breathing</p>
            </div>
          </div>
          <div class="tip-card">
            <div class="tip-icon">💤</div>
            <div class="tip-content">
              <strong>Prioritize Sleep</strong>
              <p class="muted">Aim for 7-9 hours of quality sleep</p>
            </div>
          </div>
          <div class="tip-card">
            <div class="tip-icon">🚶</div>
            <div class="tip-content">
              <strong>Stay Active</strong>
              <p class="muted">A short walk can boost your mood</p>
            </div>
          </div>
        </div>
      </div>
    `);

    // Bind navigation buttons
    document.getElementById('btn-log-mood').addEventListener('click', () => navigate('/mood'));
    document.getElementById('btn-book-appt').addEventListener('click', () => navigate('/appointments'));
    document.getElementById('btn-find-counselor').addEventListener('click', () => navigate('/counselors'));
    document.getElementById('btn-view-appts').addEventListener('click', () => navigate('/appointments'));
    document.getElementById('btn-view-mood').addEventListener('click', () => navigate('/mood'));

  } catch (e) {
    renderError(e);
  }
}

