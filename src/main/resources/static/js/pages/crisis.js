import { renderMain } from '../ui.js';

export async function loadCrisis() {
  renderMain(`
    <div class="card">
      <h2>Crisis Support</h2>
      <p class="muted">If you or someone else is in immediate danger, seek emergency help right now.</p>
    </div>
    <div class="card">
      <h3>Call now</h3>
      <p>
        <a class="btn btn-primary" href="tel:+250786243990">Call +250786243990</a>
      </p>
      <p class="hint">On mobile this will open the dialer. On desktop it will use your calling app (if available).</p>
    </div>
  `);
}


