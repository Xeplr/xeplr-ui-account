// The sign-up calls in api.js / adminApi.js, over real HTTP to a local server:
// what each sends, the not-activated code reaching the caller, and a refresh
// that cannot reach the server keeping the session. Plus returnTo's
// deliberate sign-out.
import test, { before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

function storage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}
global.localStorage = storage();
global.sessionStorage = storage();

let server, base, seen = [];
let refreshMode = 'ok';

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization || null, body: body ? JSON.parse(body) : null });
      const send = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (req.url === '/auth/api/refresh') {
        if (refreshMode === 'drop') return req.socket.destroy();
        return send(200, { accessToken: 'fresh', refreshToken: 'r2' });
      }
      if (req.url === '/auth/api/login') return send(403, { error: 'Your account is not activated yet.', code: 'NOT_ACTIVATED' });
      if (req.url === '/expired') return send(401, { error: 'Invalid or expired token' });
      if (req.url.indexOf('/auth/api/invite-preview') === 0) return send(200, { email: 'ivy@x.y', name: 'Ivy' });
      return send(200, { message: 'ok' });
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  const { configure } = await import('../src/api.js');
  configure(base);
});

after(() => server.close());

test('resend, invite preview and invite accept send what the server expects', async () => {
  const api = await import('../src/api.js');
  seen = [];
  await api.resendActivation({ email: 'a@x.y' });
  const info = await api.previewInvite('t/1');
  await api.acceptInvite({ token: 't1', name: 'Ivy', password: 'pw' });
  assert.deepEqual(seen.map((s) => s.method + ' ' + s.url), [
    'POST /auth/api/resend-activation',
    'GET /auth/api/invite-preview?token=t%2F1',
    'POST /auth/api/invite-accept'
  ]);
  assert.deepEqual(seen[0].body, { email: 'a@x.y' });
  assert.deepEqual(info, { email: 'ivy@x.y', name: 'Ivy' });
  assert.deepEqual(seen[2].body, { token: 't1', name: 'Ivy', password: 'pw' });
});

test('the not-activated refusal reaches the caller as status + code', async () => {
  const api = await import('../src/api.js');
  await assert.rejects(api.loginUser({ email: 'a@x.y', password: 'pw' }), (err) => {
    assert.equal(err.status, 403);
    assert.equal(err.code, 'NOT_ACTIVATED');
    return true;
  });
});

test('an admin activates a user by id, signed in', async () => {
  const { activateUser } = await import('../src/adminApi.js');
  localStorage.setItem('accessToken', 'tok');
  seen = [];
  await activateUser('u 1');
  assert.equal(seen[0].method + ' ' + seen[0].url, 'POST /auth/api/admin/users/u%201/activate');
  assert.equal(seen[0].auth, 'Bearer tok');
});

test('a refresh that cannot reach the server keeps the session', async () => {
  const api = await import('../src/api.js');
  let expired = 0;
  api.setSessionExpiredHandler(() => { expired++; });
  localStorage.setItem('accessToken', 'old');
  localStorage.setItem('refreshToken', 'r1');
  refreshMode = 'drop';
  try {
    await assert.rejects(api.authFetch('/expired'), /Could not reach the server/);
    assert.equal(localStorage.getItem('refreshToken'), 'r1', 'tokens kept');
    assert.equal(expired, 0, 'not treated as a dead session');
  } finally {
    refreshMode = 'ok';
  }
});

test('a deliberate sign-out records no return address until the next sign-in', async () => {
  const { saveReturnTo, consumeReturnTo, markDeliberateSignOut } = await import('../src/returnTo.js');
  saveReturnTo({ pathname: '/reports', search: '?a=1' });
  markDeliberateSignOut();
  saveReturnTo({ pathname: '/auth/change-password', search: '' });
  assert.equal(consumeReturnTo(), null, 'nothing kept across a chosen sign-out');

  saveReturnTo({ pathname: '/reports', search: '' });
  assert.equal(consumeReturnTo(), '/reports', 'after the next sign-in it records again');
});
