const KEY = 'xeplr:returnTo';

/**
 * Where a redirect-driven gate (auth, or an app's own e.g. company gate)
 * sends the user next, once whatever it was waiting for resolves. Tab-scoped
 * (sessionStorage) — this is for "the token expired mid-session, send me
 * back to what I was doing", not a link resurrected days later.
 */
export function saveReturnTo(location) {
  if (_deliberateSignOut) return;
  try {
    sessionStorage.setItem(KEY, location.pathname + location.search);
  } catch (e) {}
}

// A SIGN-OUT THE PERSON CHOSE is not being kept out. Signed out on a
// protected page, the gate would record that page as the place to return to
// — so after changing a password, signing in again landed back on the
// change-password form. Set just before such a sign-out; the next sign-in
// (consumeReturnTo) clears it. An expired session never sets it, so that
// still returns people to what they were doing.
let _deliberateSignOut = false;

export function markDeliberateSignOut() {
  _deliberateSignOut = true;
  try { sessionStorage.removeItem(KEY); } catch (e) {}
}

/** Reads and clears in one step — call only at the point the user actually lands. */
export function consumeReturnTo() {
  _deliberateSignOut = false;
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return value;
  } catch (e) {
    return null;
  }
}
