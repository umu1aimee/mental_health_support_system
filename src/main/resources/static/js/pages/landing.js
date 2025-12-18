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
              Track mood, find the right counselor by specialty, and book sessions based on real availability—
              all in one secure, role-based experience.
            </p>
            <div class="hero-actions">
              <button class="btn btn-primary" id="btn-hero-login">Get started</button>
              <button class="btn btn-ghost" id="btn-hero-demo">Explore features</button>
            </div>
            <div class="hero-metrics">
              <div class="metric"><div class="metric-value">Mood</div><div class="metric-label">Tracking</div></div>
              <div class="metric"><div class="metric-value">Real</div><div class="metric-label">Availability</div></div>
              <div class="metric"><div class="metric-value">Role‑based</div><div class="metric-label">Dashboards</div></div>
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
            <div class="feature-text">Mood tracking, counselor discovery by specialty, availability viewing, appointment booking/cancel.</div>
          </div>
          <div class="feature">
            <div class="feature-title">Counselor</div>
            <div class="feature-text">Availability management with date/time picker, patient mood view, appointment status updates.</div>
          </div>
          <div class="feature">
            <div class="feature-title">Admin</div>
            <div class="feature-text">User management, activation, editing user details (incl. counselor specialty), safe deletion with cleanup.</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="how-it-works">
      <div class="section-inner">
        <h2 class="section-title">How it works</h2>
        <p class="section-subtitle">A simple flow designed to reduce friction.</p>
        <div class="cards-3">
          <div class="feature">
            <div class="feature-title">1) Track</div>
            <div class="feature-text">Log your mood daily and observe trends over time.</div>
          </div>
          <div class="feature">
            <div class="feature-title">2) Match</div>
            <div class="feature-text">Choose counselors by specialty and see their weekly availability.</div>
          </div>
          <div class="feature">
            <div class="feature-title">3) Book</div>
            <div class="feature-text">Select a day/time that fits the counselor’s availability and book instantly.</div>
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

    <section class="section" id="testimonials">
      <div class="section-inner">
        <h2 class="section-title">What users love</h2>
        <p class="section-subtitle">Small details that make a big difference.</p>
        <div class="cards-3">
          <div class="feature">
            <div class="feature-title">Availability clarity</div>
            <div class="feature-text">Patients can instantly see who is available and when.</div>
          </div>
          <div class="feature">
            <div class="feature-title">Specialty matching</div>
            <div class="feature-text">Choose the right counselor for the right concern.</div>
          </div>
          <div class="feature">
            <div class="feature-title">Admin confidence</div>
            <div class="feature-text">Edit user details safely without changing roles.</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="faq">
      <div class="section-inner">
        <h2 class="section-title">FAQ</h2>
        <p class="section-subtitle">Common questions to help you get started faster.</p>
        <div class="cards-2">
          <div class="feature">
            <div class="feature-title">How do I see counselor availability?</div>
            <div class="feature-text">Open Appointments and select a counselor card to view weekly availability and day details.</div>
          </div>
          <div class="feature">
            <div class="feature-title">How can I contact support?</div>
            <div class="feature-text">Use the footer Support links or call <b>+250786243990</b> for urgent help.</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="crisis">
      <div class="section-inner">
        <div class="cta">
          <div>
            <div class="cta-title">In a crisis right now?</div>
            <div class="cta-text">Call our crisis line for immediate support.</div>
          </div>
          <a class="btn btn-primary" href="tel:+250786243990">Call +250786243990</a>
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
