export const state = {
  me: null,
};

const listeners = new Set();

export function setState(partial) {
  Object.assign(state, partial);
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
