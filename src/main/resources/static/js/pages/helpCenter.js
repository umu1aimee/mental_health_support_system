import { renderMain } from '../ui.js';

export async function loadHelpCenter() {
  renderMain(`
    <div class="card">
      <h2>Help Center</h2>
      <p class="muted">Quick answers and guidance for using MindCare.</p>
    </div>

    <div class="cards-2">
      <div class="feature">
        <div class="feature-title">Patients</div>
        <div class="feature-text">Track mood, find counselors by specialty, check availability, and book appointments.</div>
      </div>
      <div class="feature">
        <div class="feature-title">Counselors</div>
        <div class="feature-text">Set weekly availability and manage your appointments and patients.</div>
      </div>
      <div class="feature">
        <div class="feature-title">Admins</div>
        <div class="feature-text">Create counselors/admins, edit user details (not roles), activate/deactivate accounts, and delete safely.</div>
      </div>
      <div class="feature">
        <div class="feature-title">Troubleshooting</div>
        <div class="feature-text">If something looks stuck, refresh (Ctrl+Shift+R) and ensure the server is running on port 8080.</div>
      </div>
    </div>
  `);
}


