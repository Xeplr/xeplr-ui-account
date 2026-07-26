import { getToken, setToken, getRefreshToken, setRefreshToken, clearAuth } from './token.js';
import { getActiveScope, clearActiveScope } from './activeScope.js';
import { getMtConfig } from './mt.js';

let _baseUrl = '';
let _onSessionExpired = null;
let _refreshPromise = null;

/**
 * Configure the auth API base URL.
 * @param {string} baseUrl - e.g. 'http://localhost:19001'
 * @param {object} [options]
 * @param {function} [options.onSessionExpired] - Called when refresh token also fails (full logout)
 */
export function configure(baseUrl, options = {}) {
  _baseUrl = baseUrl;
  _onSessionExpired = options.onSessionExpired || null;
}

function getBaseUrl() {
  return _baseUrl || '';
}

/**
 * Refresh the access token using the stored refresh token.
 * Returns true if refresh succeeded, false if session is dead.
 * Deduplicates concurrent refresh calls.
 */
async function refreshAccessToken() {
  // If a refresh is already in flight, wait for it
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${getBaseUrl()}/auth/api/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearAuth();
        if (_onSessionExpired) _onSessionExpired();
        return false;
      }

      const data = await res.json();
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      return true;
    } catch (e) {
      clearAuth();
      if (_onSessionExpired) _onSessionExpired();
      return false;
    }
  })();

  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
  }
}

/**
 * Absorb a server-issued sliding-refresh token. When the access token was
 * expired-but-within-tolerance, the API serves the request normally and hands
 * back a fresh token via the `X-New-Token` header (see @xeplr/auth
 * authMiddleware). We just swap it into storage — no gating, no retry. This is
 * the happy path; it means most expiries never produce a 401 at all.
 */
function absorbNewToken(res) {
  try {
    const fresh = res.headers.get('X-New-Token');
    if (fresh) setToken(fresh);
  } catch (e) {}
}

/**
 * Authenticated fetch with sliding refresh.
 * Attaches Bearer token; absorbs X-New-Token off every response. The 401→refresh
 * path below is now only a fallback for a token past the whole tolerance window.
 */
export async function authFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${getBaseUrl()}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach the app's active scope (e.g. company/workspace) per configured MT
  // level — see mt.js's registerMTs() and activeScope.js.
  const mtConfig = getMtConfig();
  Object.keys(mtConfig.slots).forEach((level) => {
    const slot = mtConfig.slots[level];
    const scope = getActiveScope(level);
    if (scope && scope.id) headers[slot.header] = scope.id;
  });

  let res = await fetch(url, { ...options, headers });
  absorbNewToken(res);

  // Fallback: token is past the tolerance window (truly dead) → rotate via the
  // refresh token and retry once. With server-side sliding refresh this rarely
  // fires; the tolerance window absorbs ordinary expiries above.
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      res = await fetch(url, { ...options, headers });
      absorbNewToken(res);
    }
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

/**
 * Unauthenticated request (for login, register, etc.)
 */
async function request(endpoint, options = {}) {
  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export function registerUser({ email, password, name, phoneNumber }) {
  return request('/auth/api/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, phoneNumber }),
  });
}

export function activateAccount(token) {
  return request('/auth/api/activate?token=' + encodeURIComponent(token));
}

export function loginUser({ email, password }) {
  return request('/auth/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function forgotPassword({ email }) {
  return request('/auth/api/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword({ token, newPassword }) {
  return request('/auth/api/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

export function changePassword({ currentPassword, newPassword }) {
  return authFetch('/auth/api/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
  });
}

export function getProfile() {
  return authFetch('/auth/api/profile');
}

export function updateProfile(fields) {
  return authFetch('/auth/api/profile', {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
}

/**
 * Upload a new profile picture. Bypasses authFetch's JSON Content-Type (the
 * browser sets multipart/form-data with the right boundary itself when the
 * body is a FormData — setting it manually breaks the boundary).
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${getBaseUrl()}/auth/api/profile/avatar`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export function logoutUser() {
  const refreshToken = getRefreshToken();
  const accessToken = getToken();

  clearAuth();
  clearActiveScope();

  // Best-effort server-side cleanup
  if (refreshToken) {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    fetch(`${getBaseUrl()}/auth/api/logout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
}
