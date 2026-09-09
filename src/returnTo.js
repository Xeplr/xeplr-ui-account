const KEY = 'xeplr:returnTo';

/**
 * Where a redirect-driven gate (auth, or an app's own e.g. company gate)
 * sends the user next, once whatever it was waiting for resolves. Tab-scoped
 * (sessionStorage) — this is for "the token expired mid-session, send me
 * back to what I was doing", not a link resurrected days later.
 */
export function saveReturnTo(location) {
  try {
    sessionStorage.setItem(KEY, location.pathname + location.search);
  } catch (e) {}
}

/** Reads and clears in one step — call only at the point the user actually lands. */
export function consumeReturnTo() {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return value;
  } catch (e) {
    return null;
  }
}
