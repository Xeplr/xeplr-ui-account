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
  if (options.onSessionExpired) _onSessionExpired = options.onSessionExpired;
}

/**
 * Register the session-expired handler on its own, separate from configure().
 *
 * configure(baseUrl) runs at module load, before React mounts — AccessProvider
 * (the thing that actually owns `authenticated` state and a real logout()) does
 * not exist yet at that point. AccessProvider calls this itself, once, from a
 * mount effect — so every consumer of this package gets a session-expired
 * handler wired to its own auth state automatically, without the app having to
 * remember to pass onSessionExpired through configure() by hand.
 */
export function setSessionExpiredHandler(fn) {
  _onSessionExpired = fn || null;
}

function getBaseUrl() {
  return _baseUrl || '';
}

/**
 * How much of an unreadable body to keep. Enough to recognise a login page, a
 * proxy's 502 template or a stack trace; not so much that one bad response
 * fills the console and buries the request that caused it.
 */
const BODY_SNIPPET_LIMIT = 600;

/**
 * What the body looks like, said in one word.
 *
 * Nine times in ten the answer is already here — "it's an HTML page" means a
 * proxy or a dev server answered instead of the API, and "it's empty" means
 * the connection closed before anything was written. Naming the shape saves
 * reading the snippet at all.
 */
function describeBody(text, contentType) {
  const body = (text || '').trim();
  if (!body) return 'the body was empty';
  const head = body.slice(0, 200).toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) {
    return 'the body is an HTML page, not JSON — something other than the API answered (a proxy, a dev server, or a login redirect)';
  }
  if (head.startsWith('<')) return 'the body is markup, not JSON';
  if (head.startsWith('<?xml')) return 'the body is XML, not JSON';
  if (contentType && contentType.indexOf('json') === -1) {
    return `the body is ${contentType}, not JSON`;
  }
  return 'the body starts like JSON but does not parse — it is probably truncated';
}

/**
 * res.json() throws a raw, user-facing-unfriendly SyntaxError ("Unexpected
 * end of JSON input") when the body isn't valid JSON — a restarting API, a
 * proxy timeout, or an unhandled exception upstream (e.g. a downstream DB
 * dependency being down) all produce exactly this. Every caller of authFetch/
 * request needs a real Error with a message worth showing, not a parser
 * crash — this is the one place that guarantees it.
 *
 * ── and it has to say WHY, not only that ────────────────────────────────
 *
 * "The server sent back something we could not read" is a fine sentence for
 * the person using the app and useless to the person fixing it. It is the same
 * sentence whether the API was restarting, a proxy returned its own HTML error
 * page, the response was truncated mid-flight, or an auth redirect landed the
 * login page on a JSON endpoint — four different problems with four different
 * fixes, reported identically. Somebody then has to reproduce it with devtools
 * open to learn what a failed request already knew.
 *
 * So the console gets everything the moment it happens: which request, the
 * status, the content type, how many bytes arrived, what the body appears to
 * be, and the first {BODY_SNIPPET_LIMIT} characters of it verbatim. Same
 * bargain the movement log makes — the sentence is for a human, the facts are
 * for whoever has to answer for it, and neither replaces the other.
 *
 * Read via text() rather than json() on purpose: json() consumes the stream,
 * so by the time it throws the body cannot be read back to find out what it
 * was. Parsing the text ourselves is the same result on the happy path and
 * leaves the evidence intact on the unhappy one.
 */
async function parseJsonResponse(res, sent) {
  const contentType = (res.headers && res.headers.get('content-type')) || '';
  const label = sent ? `${sent.method || 'GET'} ${sent.url || ''}` : (res.url || 'request');

  let text;
  try {
    text = await res.text();
  } catch (e) {
    // The stream itself failed — a connection dropped mid-body. There is no
    // snippet to show, and saying so is better than an empty one implying the
    // server sent nothing.
    console.error(
      `[api] ${label} — the response body could not be read (status ${res.status}): ${e.message}`
    );
    const err = new Error('The connection dropped while the server was replying. Please try again.');
    err.status = res.status;
    return Promise.reject(err);
  }

  try {
    // '' is not valid JSON, which is the behaviour we want for a 204 or an
    // empty error body — it lands in the catch below with "the body was empty"
    // rather than silently becoming null.
    return JSON.parse(text);
  } catch (e) {
    const shape = describeBody(text, contentType);
    const snippet = (text || '').slice(0, BODY_SNIPPET_LIMIT);

    // console.error, not warn: nothing downstream can recover from this, and a
    // warning is what people filter out.
    console.error(
      `[api] ${label} — could not read the reply as JSON.\n` +
      `      status       : ${res.status}${res.statusText ? ' ' + res.statusText : ''}\n` +
      `      content-type : ${contentType || '(none sent)'}\n` +
      `      body length  : ${(text || '').length} character(s)\n` +
      `      looks like   : ${shape}\n` +
      `      parser said  : ${e.message}\n` +
      `      body starts  : ${snippet || '(nothing)'}` +
      ((text || '').length > BODY_SNIPPET_LIMIT ? `\n      (truncated — ${(text || '').length - BODY_SNIPPET_LIMIT} more character(s))` : '')
    );

    const err = new Error(
      res.ok
        ? `The server sent back something we could not read (${shape}). Please try again.`
        : `The server is not responding correctly (status ${res.status}). It may be restarting — please try again in a moment.`
    );
    // Carried on the error as well as logged: a caller that wants to show the
    // detail in a snackbar, or attach it to a bug report, should not have to
    // ask the user to open devtools and copy a console line.
    err.status = res.status;
    err.contentType = contentType || null;
    err.rawBody = snippet;
    err.bodyLength = (text || '').length;
    err.parseError = e.message;
    err.request = label;
    throw err;
  }
}

/**
 * The most useful sentence in a failed response.
 *
 * `error` is a STRING on a handled refusal ("Not authorized for companyId …")
 * and an OBJECT on an unhandled one — the framework's error handler sends
 * { code, message, error: { name, message, nativeError } }. This used to be
 * `data.error || 'Something went wrong'`, which for the object case built
 * `new Error({...})` and produced the message "[object Object]".
 *
 * That is the worst possible outcome for the one place every request funnels
 * through: the server said "column reportTimezone of relation cubes does not
 * exist" and the screen said nothing at all. Every caller shows err.message,
 * so what this picks is what the user is told.
 *
 * Order matters. The nested `error.message` is the specific one; `message` at
 * the top level is usually the generic "Internal server error" that would tell
 * somebody nothing.
 */
function errorMessage(data) {
  if (!data) return 'Something went wrong';
  if (typeof data.error === 'string' && data.error) return data.error;
  if (data.error && typeof data.error.message === 'string' && data.error.message) {
    return data.error.message;
  }
  if (typeof data.message === 'string' && data.message) return data.message;
  return 'Something went wrong';
}

/**
 * The Error every failed request throws — carrying WHY, not just what.
 *
 * `new Error(message)` discards the status code and the response body, so
 * every caller could see the sentence and nothing else. That flattens two very
 * different things into one: "you did something wrong" and "this is not ready
 * yet, ask again shortly".
 *
 * It cost a real bug. A cube profile answers 409 with `busy: true` while a
 * table is still being copied — a WAIT — and the screen rendered it as a red
 * error banner, so a table doing exactly what it should looked like a failure
 * and stopped the user.
 *
 * So the status and the body ride along. Existing callers read `err.message`
 * and are unaffected; callers that care can now tell a 409 from a 400.
 */
function httpError(data, res, sent) {
  const err = new Error(errorMessage(data));
  err.status = res ? res.status : 0;
  err.body = data || null;
  // Hoisted for the flags a server sets deliberately, so a caller writes
  // `err.busy` rather than `err.body && err.body.busy`.
  if (data && typeof data === 'object') {
    if (data.busy !== undefined) err.busy = data.busy;
    if (data.code !== undefined) err.code = data.code;
  }

  // ── WHICH REQUEST FAILED, said out loud, every time ────────────────────
  //
  // The thrown Error carries a sentence, and a sentence is all the snackbar
  // shows: "Not authorized for companyId", "column reportTimezone does not
  // exist". Neither says which URL produced it — and the same sentence can
  // come from several endpoints, so the first question after seeing one is
  // always "coming from where?", answered today by opening the network tab
  // and reproducing it.
  //
  // Every failure funnels through here, so this is the one place that can
  // answer it for free. A failed request is rare by definition; there is no
  // volume argument for staying quiet about it.
  //
  // `res.url` is the resolved, final URL — after redirects — which is
  // occasionally the actual answer (a request that ended up somewhere other
  // than the API is exactly why the reply did not parse).
  const label = sent
    ? `${sent.method || 'GET'} ${sent.url || ''}`
    : ((res && res.url) || 'request');
  err.request = label;

  const detail = data && typeof data === 'object' && data.error && typeof data.error === 'object'
    ? data.error
    : null;

  console.error(
    `[api] ${label} failed — ${res ? res.status : 0}${res && res.statusText ? ' ' + res.statusText : ''}: ${err.message}` +
    (err.code !== undefined ? `\n      code   : ${err.code}` : '') +
    (err.busy !== undefined ? `\n      busy   : ${err.busy}` : '') +
    // The server's own error object when it sent one — the name and the
    // native database/driver message under the friendly sentence.
    (detail && detail.name ? `\n      name   : ${detail.name}` : '') +
    (detail && detail.nativeError ? `\n      native : ${typeof detail.nativeError === 'string' ? detail.nativeError : JSON.stringify(detail.nativeError)}` : '')
  );

  return err;
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
    if (!refreshToken) {
      // No refresh token to even try — this session is just as dead as one
      // where the refresh call gets rejected below, and needs the same
      // cleanup + notification, not a silent no-op.
      clearAuth();
      if (_onSessionExpired) _onSessionExpired();
      return false;
    }

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

  const data = await parseJsonResponse(res, { method: options.method || 'GET', url: url });
  if (!res.ok) {
    throw httpError(data, res, { method: options.method || 'GET', url: url });
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
  const requested = { method: options.method || 'GET', url: `${getBaseUrl()}${endpoint}` };
  const data = await parseJsonResponse(res, requested);
  if (!res.ok) {
    throw httpError(data, res, requested);
  }
  return data;
}

export function registerUser({ email, password, name, phoneNumber }) {
  return request('/auth/api/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, phoneNumber }),
  });
}

export function activateAccount(token, workflowKey) {
  // workflowKey travels in the activation link and is handed straight back —
  // it releases a workflow step that was waiting for this person to activate
  // (see @xeplr/auth's configureWorkflowResume). Absent for an ordinary
  // registration, and the server treats it as optional.
  var url = '/auth/api/activate?token=' + encodeURIComponent(token);
  if (workflowKey) url += '&workflowKey=' + encodeURIComponent(workflowKey);
  return request(url);
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

/**
 * WHO AM I AND WHAT MAY I SEE — answered fresh by the server.
 *
 * Returns { user, access }. The same object login hands back, which is the
 * point: it is the one shape AccessProvider stores, so re-reading it is a
 * replacement rather than a merge.
 *
 * Exists because access was written to localStorage at login and never read
 * again from anywhere else. Grant somebody a role, seed a menu, take a page
 * away — none of it reached a signed-in browser until that person happened to
 * log out, which could be weeks. See AccessProvider.
 */
export function getMe() {
  return authFetch('/auth/api/me');
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
  const avatarRequest = { method: 'POST', url: `${getBaseUrl()}/auth/api/profile/avatar` };
  const data = await parseJsonResponse(res, avatarRequest);
  if (!res.ok) {
    throw httpError(data, res, avatarRequest);
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
