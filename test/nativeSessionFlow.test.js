// A phone app's session (src/native/session.js), over real HTTP to a local
// recorder standing where @xeplr/auth would: the server it talks to, signing
// in (password, a code, the second step), what is kept on the phone, what the
// person may see read again, and signing out. The sign-in itself runs against
// @xeplr/auth in its own tests; this is what the phone does with the answers.
import test, { before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const ACCESS = { menus: ['form:rental'], menuItems: [{ name: 'form:rental', label: 'Rentals', sortOrder: 1 }] };
const LATER = { menus: [], menuItems: [] };
let server, base, seen = [], answer = {};

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : null, auth: req.headers.authorization || null });
      const reply = answer[req.url];
      const [status, payload] = typeof reply === 'function' ? reply() : (reply || [200, { ok: true }]);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(() => server.close());

const signedIn = { accessToken: 'at1', refreshToken: 'rt1', trustToken: 'trust1', user: { id: 'u1', name: 'Riya' }, access: ACCESS };

test('nothing remembered and no build server: signed out, the suggested address offered', async () => {
  const s = await import('../src/native/session.js');
  s.startSession({ suggested: base });
  assert.equal(s.startingServer(), base);
  assert.deepEqual([s.useSession.length, typeof s.useSession], [0, 'function']);
  await assert.rejects(s.signIn({ server: '', email: 'a@b.c', password: 'x' }), /Type the server/);
});

test('a server that cannot say which ways in: the password, as before', async () => {
  const s = await import('../src/native/session.js');
  answer['/auth/api/sign-in-options'] = [500, { message: 'down' }];
  assert.deepEqual((await s.signInOptions(base)).methods, ['password']);
  answer['/auth/api/sign-in-options'] = [200, { methods: ['password', 'email_otp'] }];
  assert.deepEqual((await s.signInOptions(base)).methods, ['password', 'email_otp']);
  answer['/auth/api/sign-in-options'] = [200, { nothing: true }];
  assert.deepEqual((await s.signInOptions(base)).methods, ['password']);
});

test('email + password: signed in, tokens, who and what they may see kept on the phone, the server remembered', async () => {
  const s = await import('../src/native/session.js');
  answer['/auth/api/login'] = [200, signedIn];
  assert.deepEqual(await s.signIn({ server: base, email: ' riya@example.com ', password: 'pw' }), { signedIn: true });
  assert.equal(seen[seen.length - 1].body.email, 'riya@example.com', 'the email as typed, trimmed');
  const tok = await import('../src/token.js');
  assert.equal(tok.getToken(), 'at1');
  assert.equal(JSON.parse(store.get('access')).menus[0], 'form:rental');
  assert.equal(store.get('app.server'), base);
});

test('a server that answers without tokens did not sign anybody in', async () => {
  const s = await import('../src/native/session.js');
  answer['/auth/api/login'] = [200, { ok: true }];
  await assert.rejects(s.signIn({ server: base, email: 'a@b.c', password: 'pw' }), /did not sign you in/);
});

test('a code by email, then the second step, then signed in', async () => {
  const s = await import('../src/native/session.js');
  await s.sendSignInCode({ server: base, email: ' riya@example.com ' });
  assert.deepEqual([seen[seen.length - 1].url, seen[seen.length - 1].body], ['/auth/api/login/code', { email: 'riya@example.com' }]);
  await s.sendSignInCode({ server: base, phoneNumber: '98765 43210' });
  assert.deepEqual(seen[seen.length - 1].body, { phoneNumber: '98765 43210' });

  const second = { ticket: 'tk', method: 'authenticator', methods: ['authenticator', 'email'], sentTo: '', trustDays: 15 };
  answer['/auth/api/login/code/verify'] = [200, { secondStep: second }];
  assert.deepEqual(await s.signInWithCode({ server: base, email: 'riya@example.com', code: '123456' }), { secondStep: second });
  answer['/auth/api/login/second-step/send'] = [200, { sent: true, method: 'email', sentTo: 'r***@example.com' }];
  assert.equal((await s.sendSecondCode({ ticket: 'tk', method: 'email' })).sentTo, 'r***@example.com');
  answer['/auth/api/login/second-step/verify'] = [200, signedIn];
  assert.deepEqual(await s.finishSecondStep({ server: base, ticket: 'tk', method: 'email', code: '654321', trustDevice: true }), { signedIn: true });
  const tok = await import('../src/token.js');
  assert.equal(tok.getTrustToken(), 'trust1', 'the trusted-device token kept');
});

test('what the person may see is read again — and kept when the server cannot be reached', async () => {
  const s = await import('../src/native/session.js');
  answer['/auth/api/me'] = [200, { user: { id: 'u1', name: 'Riya' }, access: LATER }];
  assert.deepEqual(await s.refreshAccess(), LATER, 'a menu taken away is gone');
  assert.deepEqual(JSON.parse(store.get('access')), LATER);
  answer['/auth/api/me'] = [503, { message: 'restarting' }];
  assert.deepEqual(await s.refreshAccess(), LATER, 'a blip does not empty the menu');
});

test('opening the app again: the remembered server, still signed in, access read again', async () => {
  const s = await import('../src/native/session.js');
  answer['/auth/api/me'] = [200, { user: { id: 'u1' }, access: ACCESS }];
  const before = seen.length;
  s.startSession({});
  assert.equal(s.startingServer(), base, 'the remembered server');
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(seen.slice(before).some((x) => x.url === '/auth/api/me'), 'access asked again on open');
});

test('a build made for one server goes there, whatever was typed or remembered', async () => {
  const s = await import('../src/native/session.js');
  s.startSession({ builtInServer: base + '/' });
  assert.equal(s.startingServer(), base);
  answer['/auth/api/login'] = [200, signedIn];
  await s.signIn({ server: 'somewhere-else.example.com', email: 'a@b.c', password: 'pw' });
  assert.equal(seen[seen.length - 1].url, '/auth/api/login', 'sent to the build\'s own server');
  answer['/auth/api/login/second-step/verify'] = [200, signedIn];
  await s.finishSecondStep({ server: 'elsewhere', ticket: 't', method: 'email', code: '1' });
  assert.equal(store.get('app.server'), base);
});

test('signing out forgets who and what they may see', async () => {
  const s = await import('../src/native/session.js');
  s.signOut();
  assert.equal(store.get('access'), undefined);
  const tok = await import('../src/token.js');
  assert.equal(tok.getToken(), null);
});
