import { renderMain } from '../ui.js';

export async function loadTerms() {
  renderMain(`
    <div class="card">
      <h2>Terms of Service</h2>
      <p class="muted">This is a placeholder terms page for a student project. Replace with real terms.</p>
    </div>
    <div class="card">
      <h3>Use responsibly</h3>
      <p class="muted">MindCare is not a substitute for professional emergency services.</p>
      <h3>Accounts</h3>
      <p class="muted">Keep your credentials private.</p>
    </div>
  `);
}


