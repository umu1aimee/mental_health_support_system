import { renderMain } from '../ui.js';

export async function loadHipaa() {
  renderMain(`
    <div class="card">
      <h2>HIPAA Compliance</h2>
      <p class="muted">This is an informational placeholder for a student project.</p>
    </div>
    <div class="card">
      <h3>Important</h3>
      <p class="muted">
        If you intend to use this in a real healthcare environment, you must implement proper security, audit logs,
        access controls, encryption, and policies.
      </p>
    </div>
  `);
}


