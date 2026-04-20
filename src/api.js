import { getToken, setToken, getRefreshToken, setRefreshToken, clearAuth } from './token.js';

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
 * Authenticated fetch with auto-refresh.
 * Attaches Bearer token, retries once on 401 after refreshing.
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

  // Attach active tenant from session
  try {
    var tenantRaw = localStorage.getItem('xeplr:activeTenant');
    if (tenantRaw) {
      var tenant = JSON.parse(tenantRaw);
      if (tenant && tenant.id) headers['X-Tenant-Id'] = tenant.id;
    }
  } catch (e) {}

  let res = await fetch(url, { ...options, headers });

  // If 401, try refreshing the token and retry once
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      res = await fetch(url, { ...options, headers });
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
    body: JSON.stringify({ currentPassword, newPassword }),
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

export function getMyTenants() {
  return authFetch('/auth/api/my-tenants');
}

export function logoutUser() {
  const refreshToken = getRefreshToken();
  const accessToken = getToken();

  clearAuth();

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
