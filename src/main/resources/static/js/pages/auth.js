import { api } from '../api.js';
import { setState } from '../state.js';
import { renderMain, renderError, toast } from '../ui.js';
import { routeDefault } from './routeDefault.js';
import { navigate } from '../router.js';

export async function loadLogin() {
  renderMain(`
    <div class="card">
      <h2>Login</h2>
      <div class="field">
        <label>Email</label>
        <input id="login-email" type="email" autocomplete="email" />
      </div>
      <div class="field">
        <label>Password</label>
        <input id="login-password" type="password" autocomplete="current-password" />
      </div>
      <div class="actions">
        <button id="btn-login">Login</button>
      </div>
      <p class="hint">No account yet? <a href="#" id="link-to-register">Register as patient</a></p>
    </div>
  `);

  document.getElementById('btn-login').addEventListener('click', async () => {
    try {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      await api('/auth/login', { method: 'POST', body: { email, password } });
      const me = await api('/auth/me');
      setState({ me });
      toast('Logged in', 'success');
      routeDefault();
    } catch (e) {
      renderError(e);
    }
  });

  document.getElementById('link-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/register');
  });
}

export async function loadRegister() {
  renderMain(`
    <div class="card">
      <h2>Register (Patient)</h2>
      <div class="field">
        <label>Name</label>
        <input id="reg-name" type="text" autocomplete="name" />
      </div>
      <div class="field">
        <label>Email</label>
        <input id="reg-email" type="email" autocomplete="email" />
      </div>
      <div class="field">
        <label>Password</label>
        <input id="reg-password" type="password" autocomplete="new-password" />
      </div>
      <div class="field">
        <label>Emergency contact (optional)</label>
        <input id="reg-emergency" type="text" />
      </div>
      <div class="actions">
        <button id="btn-register">Register</button>
      </div>
      <p class="hint">Already have an account? <a href="#" id="link-to-login">Login</a></p>
      <p class="hint">Counselors and admins are created by an existing admin.</p>
    </div>
  `);

  document.getElementById('btn-register').addEventListener('click', async () => {
    try {
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const emergencyContact = document.getElementById('reg-emergency').value;
      await api('/auth/register', {
        method: 'POST',
        body: { name, email, password, role: 'patient', emergencyContact },
      });
      const me = await api('/auth/me');
      setState({ me });
      toast('Registered and logged in', 'success');
      routeDefault();
    } catch (e) {
      renderError(e);
    }
  });

  document.getElementById('link-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/login');
  });
}

export async function logout() {
  await api('/auth/logout', { method: 'POST' });
  const me = await api('/auth/me');
  setState({ me });
}
