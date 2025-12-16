import { state } from '../state.js';
import { navigate } from '../router.js';

export function routeDefault() {
  const me = state.me;
  if (!me || !me.authenticated) {
    navigate('/landing');
    return;
  }
  if (me.role === 'patient') {
    navigate('/mood');
    return;
  }
  if (me.role === 'counselor') {
    navigate('/counselor');
    return;
  }
  navigate('/admin');
}
