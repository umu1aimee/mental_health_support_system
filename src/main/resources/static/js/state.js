/**
 * Global client state container.
 *
 * DESIGN PATTERN: Observer
 * - `subscribe()` registers listeners (observers) that are notified whenever `setState()` mutates `state`.
 * - The UI uses this to react to auth changes (e.g., show/hide role-based nav) without tight coupling.
 *
 * Keep this module tiny and predictable:
 * - State updates go through `setState()`.
 * - Subscribers must be fast and side-effect safe; avoid throwing in listeners.
 */
export const state = {
  /** Authenticated user snapshot returned by `/api/auth/me` (or null when unknown). */
  me: null,
};

/** @type {Set<(s: typeof state) => void>} */
const listeners = new Set();

/**
 * Merge a partial update into `state` and notify subscribers.
 * @param {Partial<typeof state>} partial
 */
export function setState(partial) {
  Object.assign(state, partial);
  for (const fn of listeners) fn(state);
}

/**
 * Subscribe to state changes.
 * @param {(s: typeof state) => void} fn
 * @returns {() => void} unsubscribe function
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
