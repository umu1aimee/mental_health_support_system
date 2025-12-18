import { renderMain } from '../ui.js';

export async function loadContact() {
  renderMain(`
    <div class="card">
      <h2>Contact Us</h2>
      <p class="muted">We’re here to help. Use the options below.</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Phone</h3>
        <p><a class="link" href="tel:+250786243990">Call +250786243990</a></p>
        <p class="hint">If you are in immediate danger, contact local emergency services.</p>
      </div>
      <div class="card">
        <h3>Email</h3>
        <p class="muted">Add your support email here if you want (e.g. support@mindcare.local).</p>
      </div>
    </div>
  `);
}


