import { renderMain } from '../ui.js';
import { navigate } from '../router.js';

export async function loadLanding({ params } = {}) {
  renderMain(`
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-grid">
          <div>
            <div class="hero-kicker">MindCare Mini</div>
            <h1 class="hero-title">A clear path to mental health support</h1>
            <p class="hero-subtitle">
              Track mood, book sessions, and keep care organized for patients, counselors, and admins—
              in one simple system.
            </p>
            <div class="hero-actions">
              <button class="btn btn-primary" id="btn-hero-login">Get started</button>
              <button class="btn btn-ghost" id="btn-hero-demo">Explore features</button>
            </div>
            <div class="hero-metrics">
              <div class="metric"><div class="metric-value">3</div><div class="metric-label">Roles</div></div>
              <div class="metric"><div class="metric-value">1</div><div class="metric-label">App</div></div>
              <div class="metric"><div class="metric-value">Fast</div><div class="metric-label">Workflows</div></div>
            </div>
          </div>

          <div class="hero-art" aria-hidden="true">
            <div class="art-card art-card-1">
              <div class="art-badge">Mood</div>
              <div class="art-line"></div>
              <div class="art-line short"></div>
              <div class="art-chart">
                <div class="art-bar" style="height:60%"></div>
                <div class="art-bar" style="height:35%"></div>
                <div class="art-bar" style="height:80%"></div>
                <div class="art-bar" style="height:55%"></div>
                <div class="art-bar" style="height:70%"></div>
              </div>
            </div>
            <div class="art-circle"></div>
            <div class="art-card art-card-2">
              <div class="art-badge">Appointments</div>
              <div class="art-line"></div>
              <div class="art-line"></div>
              <div class="art-pill"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="solutions">
      <div class="section-inner">
        <h2 class="section-title">Solutions</h2>
        <p class="section-subtitle">Role-based dashboards designed for real workflows.</p>
        <div class="cards-3">
          <div class="feature">
            <div class="feature-title">Patient</div>
            <div class="feature-text">Mood tracking, counselor discovery, availability checking, appointment booking/cancel.</div>
          </div>
          <div class="feature">
            <div class="feature-title">Counselor</div>
            <div class="feature-text">Availability management with date/time picker, patient mood view, appointment status updates.</div>
          </div>
          <div class="feature">
            <div class="feature-title">Admin</div>
            <div class="feature-text">User management, roles/activation, counselor creation, safe deletion with cascading cleanup.</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="resources">
      <div class="section-inner">
        <h2 class="section-title">Resources</h2>
        <p class="section-subtitle">Keep everything organized and searchable.</p>
        <div class="cards-2">
          <div class="feature">
            <div class="feature-title">Search everywhere</div>
            <div class="feature-text">Search patients, appointments, and users with fast filters.</div>
          </div>
          <div class="feature">
            <div class="feature-title">Clean error handling</div>
            <div class="feature-text">Consistent API error messages make the UI reliable and user-friendly.</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="about">
      <div class="section-inner">
        <h2 class="section-title">About</h2>
        <p class="section-subtitle">A student-friendly full-stack project: Spring Boot + static SPA.</p>
        <div class="cta">
          <div>
            <div class="cta-title">Ready to try it?</div>
            <div class="cta-text">Login or register as a patient to explore the full flow.</div>
          </div>
          <button class="btn btn-primary" id="btn-cta-login">Login / Register</button>
        </div>
      </div>
    </section>
  `);

  const section = params?.get?.('section');
  if (section) {
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('btn-hero-login').addEventListener('click', () => navigate('/login'));
  document.getElementById('btn-cta-login').addEventListener('click', () => navigate('/login'));
  document.getElementById('btn-hero-demo').addEventListener('click', () => {
    navigate('/landing?section=solutions');
  });
}
