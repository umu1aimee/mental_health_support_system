import { api } from './api.js';
import { state, setState, subscribe } from './state.js';
import { userBadge } from './components.js';
import { renderError, toast } from './ui.js';
import { defineRoute, runRoute, startRouter, navigate } from './router.js';
import { loadLogin, loadRegister, logout } from './pages/auth.js';
import { routeDefault } from './pages/routeDefault.js';
import { loadLanding } from './pages/landing.js';
import { loadPatientDashboard } from './pages/patientDashboard.js';
import { loadPatientMood } from './pages/patientMood.js';
import { loadPatientAppointments } from './pages/patientAppointments.js';
import { loadPatientCounselors } from './pages/patientCounselors.js';
import { loadCounselorDashboard } from './pages/counselorDashboard.js';
import { loadCounselorAppointments } from './pages/counselorAppointments.js';
import { loadCounselorAvailability } from './pages/counselorAvailability.js';
import { loadAdminUsers } from './pages/adminUsers.js';
import { loadUserProfile } from './pages/userProfile.js';
import { loadContact } from './pages/contact.js';
import { loadHelpCenter } from './pages/helpCenter.js';
import { loadPrivacyPolicy } from './pages/privacyPolicy.js';
import { loadTerms } from './pages/terms.js';
import { loadHipaa } from './pages/hipaa.js';
import { loadCrisis } from './pages/crisis.js';

function setUserStatus() {
  const el = document.getElementById('user-status');
  el.innerHTML = userBadge(state.me);

  const profileEl = document.getElementById('topbar-profile');
  if (profileEl) {
    profileEl.innerHTML = userBadge(state.me);
  }

  const authLink = document.getElementById('nav-auth');
  authLink.textContent = state.me && state.me.authenticated ? 'Logout' : 'Login';

  const isAuthed = Boolean(state.me && state.me.authenticated);
  const marketingNav = document.getElementById('marketing-nav');
  const ctaBtn = document.getElementById('nav-cta');
  const appNav = document.getElementById('app-nav');
  const publicActions = document.getElementById('topbar-actions-public');
  const authActions = document.getElementById('topbar-actions-auth');

  if (marketingNav) marketingNav.style.display = isAuthed ? 'none' : '';
  if (ctaBtn) ctaBtn.style.display = isAuthed ? 'none' : '';
  if (appNav) appNav.style.display = isAuthed ? '' : 'none';
  if (publicActions) publicActions.style.display = isAuthed ? 'none' : 'flex';
  if (authActions) authActions.style.display = isAuthed ? 'flex' : 'none';

  const role = state.me && state.me.authenticated ? state.me.role : null;

  // Show/hide role-specific navigation items
  document.querySelectorAll('.nav-patient').forEach(el => {
    el.style.display = role === 'patient' ? '' : 'none';
  });
  document.querySelectorAll('.nav-counselor').forEach(el => {
    el.style.display = role === 'counselor' ? '' : 'none';
  });
  document.querySelectorAll('.nav-admin').forEach(el => {
    el.style.display = role === 'admin' ? '' : 'none';
  });
  document.querySelectorAll('.nav-auth').forEach(el => {
    el.style.display = isAuthed ? '' : 'none';
  });
}

function initNav() {
  document.getElementById('nav-auth').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      if (state.me && state.me.authenticated) {
        await logout();
        toast('Logged out', 'success');
        navigate('/landing');
      } else {
        navigate('/login');
      }
    } catch (err) {
      renderError(err);
    }
  });

  // Brand link
  const brandLink = document.getElementById('brand-link');
  if (brandLink) {
    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.me && state.me.authenticated) {
        navigate('/');
      } else {
        navigate('/landing');
      }
    });
  }

  const navSolutions = document.getElementById('nav-solutions');
  const navResources = document.getElementById('nav-resources');
  const navAbout = document.getElementById('nav-about');
  const navCta = document.getElementById('nav-cta');

  if (navSolutions) {
    navSolutions.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/landing?section=solutions');
    });
  }
  if (navResources) {
    navResources.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/landing?section=resources');
    });
  }
  if (navAbout) {
    navAbout.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/landing?section=about');
    });
  }
  if (navCta) {
    navCta.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('/register');
    });
  }

  // Patient navigation
  document.getElementById('nav-patient-dashboard').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/patient');
  });

  document.getElementById('nav-mood').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/mood');
  });

  document.getElementById('nav-appointments').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/appointments');
  });

  document.getElementById('nav-counselors').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/counselors');
  });

  // Counselor navigation
  document.getElementById('nav-counselor').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/counselor');
  });

  document.getElementById('nav-counselor-appts').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/counselor-appointments');
  });

  document.getElementById('nav-availability').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/counselor-availability');
  });

  // Admin navigation
  document.getElementById('nav-admin').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/admin');
  });

  // Common navigation
  document.getElementById('nav-profile').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/profile');
  });

  const logoutBtn = document.getElementById('topbar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await logout();
        toast('Logged out', 'success');
        navigate('/landing');
      } catch (err) {
        renderError(err);
      }
    });
  }

  // Footer links
  const on = (id, handler) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', (e) => {
      // Let tel: links work normally
      if (el.getAttribute('href') && el.getAttribute('href').startsWith('tel:')) return;
      e.preventDefault();
      handler();
    });
  };

  on('footer-platform-resources', () => navigate('/landing?section=resources'));
  on('footer-platform-patient', () => {
    if (!state.me || !state.me.authenticated) return navigate('/login');
    if (state.me.role !== 'patient') return navigate('/');
    return navigate('/patient');
  });
  on('footer-platform-counselor', () => {
    if (!state.me || !state.me.authenticated) return navigate('/login');
    if (state.me.role !== 'counselor') return navigate('/');
    return navigate('/counselor');
  });

  on('footer-support-help', () => navigate('/help'));
  on('footer-support-contact', () => navigate('/contact'));
  on('footer-support-crisis', () => navigate('/crisis'));

  on('footer-legal-privacy', () => navigate('/privacy'));
  on('footer-legal-terms', () => navigate('/terms'));
  on('footer-legal-hipaa', () => navigate('/hipaa'));
}

async function refreshMe() {
  const me = await api('/auth/me');
  setState({ me });
}

function defineRoutes() {
  defineRoute('/', async () => routeDefault());

  defineRoute('/landing', async ({ params }) => loadLanding({ params }));

  // Auth routes
  defineRoute('/auth', async () => loadLogin());
  defineRoute('/login', async () => loadLogin());
  defineRoute('/register', async () => loadRegister());

  // Patient routes
  defineRoute('/patient', async () => loadPatientDashboard());
  defineRoute('/mood', async () => loadPatientMood());
  defineRoute('/appointments', async () => loadPatientAppointments());
  defineRoute('/counselors', async () => loadPatientCounselors());

  // Counselor routes
  defineRoute('/counselor', async () => loadCounselorDashboard());
  defineRoute('/counselor-appointments', async () => loadCounselorAppointments());
  defineRoute('/counselor-availability', async () => loadCounselorAvailability());

  // Admin routes
  defineRoute('/admin', async () => loadAdminUsers());

  // Common routes
  defineRoute('/profile', async () => loadUserProfile());
  defineRoute('/contact', async () => loadContact());
  defineRoute('/help', async () => loadHelpCenter());
  defineRoute('/privacy', async () => loadPrivacyPolicy());
  defineRoute('/terms', async () => loadTerms());
  defineRoute('/hipaa', async () => loadHipaa());
  defineRoute('/crisis', async () => loadCrisis());

  defineRoute('/404', async () => {
    document.getElementById('main-content').innerHTML = '<div class="card"><h2>Not found</h2></div>';
  });
}

window.addEventListener('load', async () => {
  initNav();
  defineRoutes();
  startRouter();

  subscribe(() => setUserStatus());

  try {
    await refreshMe();
    await runRoute();
  } catch (e) {
    renderError(e);
  }
});
