const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
// "Trust this device" — given by the server after a second step, sent with
// the next sign-in so this device is not asked again. NOT cleared on sign-out:
// it belongs to the device, not to the session.
const TRUST_KEY = 'xeplrTrustToken';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function getTrustToken() {
  try { return localStorage.getItem(TRUST_KEY); } catch (e) { return null; }
}

export function setTrustToken(token) {
  try {
    if (token) localStorage.setItem(TRUST_KEY, token);
    else localStorage.removeItem(TRUST_KEY);
  } catch (e) {}
}
