import { api } from './api.js';
import { state, setState, subscribe } from './state.js';
import { userBadge } from './components.js';
import { renderError, toast } from './ui.js';
import { defineRoute, runRoute, startRouter, navigate } from './router.js';
import { loadAuth, logout } from './pages/auth.js';
import { routeDefault } from './pages/routeDefault.js';
import { loadLanding } from './pages/landing.js';
import { loadPatientMood } from './pages/patientMood.js';
import { loadPatientAppointments } from './pages/patientAppointments.js';
import { loadCounselorDashboard } from './pages/counselorDashboard.js';
import { loadCounselorAppointments } from './pages/counselorAppointments.js';
import { loadAdminUsers } from './pages/adminUsers.js';

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

  document.getElementById('nav-mood').closest('li').style.display = role === 'patient' ? '' : 'none';
  document.getElementById('nav-appointments').closest('li').style.display = role === 'patient' ? '' : 'none';

  document.getElementById('nav-counselor').closest('li').style.display = role === 'counselor' ? '' : 'none';
  document.getElementById('nav-counselor-appts').closest('li').style.display = role === 'counselor' ? '' : 'none';

  document.getElementById('nav-admin').closest('li').style.display = role === 'admin' ? '' : 'none';
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
        navigate('/auth');
      }
    } catch (err) {
      renderError(err);
    }
  });

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
      navigate('/auth');
    });
  }

  document.getElementById('nav-mood').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/mood');
  });

  document.getElementById('nav-appointments').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/appointments');
  });

  document.getElementById('nav-counselor').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/counselor');
  });

  document.getElementById('nav-counselor-appts').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/counselor-appointments');
  });

  document.getElementById('nav-admin').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/admin');
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
}

async function refreshMe() {
  const me = await api('/auth/me');
  setState({ me });
}

function defineRoutes() {
  defineRoute('/', async () => routeDefault());

  defineRoute('/landing', async ({ params }) => loadLanding({ params }));

  defineRoute('/auth', async () => loadAuth());

  defineRoute('/mood', async () => loadPatientMood());
  defineRoute('/appointments', async () => loadPatientAppointments());

  defineRoute('/counselor', async () => loadCounselorDashboard());
  defineRoute('/counselor-appointments', async () => loadCounselorAppointments());

  defineRoute('/admin', async () => loadAdminUsers());

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
