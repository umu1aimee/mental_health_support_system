import { renderMain } from '../ui.js';

export async function loadPrivacyPolicy() {
  renderMain(`
    <div class="card">
      <h2>Privacy Policy</h2>
      <p class="muted">This is a student project policy page. Replace with your real policy text.</p>
    </div>
    <div class="card">
      <h3>What we store</h3>
      <p class="muted">Account info (email/name), mood entries, appointments, and counselor availability.</p>
      <h3>How we use it</h3>
      <p class="muted">To provide the app features only.</p>
      <h3>Contact</h3>
      <p><a class="link" href="tel:+250786243990">Call +250786243990</a></p>
    </div>
  `);
}


