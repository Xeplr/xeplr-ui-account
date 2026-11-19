// The sign-in steps' model: what each new call sends (real HTTP to a local
// recorder), the trusted-device token outliving sign-out, and the QR code
// cells. The flows themselves run against @xeplr/auth in its own tests.
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

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization || null, body: body ? JSON.parse(body) : null });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(req.url === '/auth/api/sign-in-options'
        ? { methods: ['password', 'email_otp'], twoFactor: 'optional', twoFactorMethods: ['authenticator', 'email'], trustDays: 30 }
        : { ok: true }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  const { configure } = await import('../src/api.js');
  configure(base);
});

after(() => server.close());

function last() { return seen[seen.length - 1]; }

test('the ways in send what @xeplr/auth reads, and nothing it does not', async () => {
  const api = await import('../src/api.js');
  assert.deepEqual((await api.getSignInOptions()).methods, ['password', 'email_otp']);

  await api.loginUser({ email: 'a@b.c', password: 'pw', trustToken: 't1' });
  assert.deepEqual(last().body, { email: 'a@b.c', password: 'pw', trustToken: 't1' });
  await api.loginUser({ email: 'a@b.c', password: 'pw' });
  assert.deepEqual(last().body, { email: 'a@b.c', password: 'pw' }, 'no trustToken key when there is none');

  await api.requestSignInCode({ phoneNumber: '98765 43210' });
  assert.deepEqual([last().method, last().url, last().body], ['POST', '/auth/api/login/code', { phoneNumber: '98765 43210' }]);
  await api.verifySignInCode({ email: 'a@b.c', code: '123456' });
  assert.deepEqual([last().url, last().body], ['/auth/api/login/code/verify', { email: 'a@b.c', code: '123456' }]);

  await api.sendSecondStepCode({ ticket: 'tk', method: 'email' });
  assert.deepEqual([last().url, last().body], ['/auth/api/login/second-step/send', { ticket: 'tk', method: 'email' }]);
  await api.verifySecondStep({ ticket: 'tk', method: 'authenticator', code: '1' });
  assert.deepEqual(last().body, { ticket: 'tk', method: 'authenticator', code: '1', trustDevice: false });
  assert.equal(last().auth, null, 'signing in carries no token');
});

test('my second step: signed calls', async () => {
  const api = await import('../src/api.js');
  const { setToken } = await import('../src/token.js');
  const { resetUserTwoFactor } = await import('../src/adminApi.js');
  setToken('acc');
  await api.getTwoFactor();
  assert.deepEqual([last().method, last().url, last().auth], ['GET', '/auth/api/two-factor', 'Bearer acc']);
  await api.startAuthenticator({ issuer: 'GharArt CRM' });
  assert.deepEqual(last().body, { issuer: 'GharArt CRM' });
  await api.confirmAuthenticator({ code: '123456' });
  assert.equal(last().url, '/auth/api/two-factor/authenticator/confirm');
  await api.chooseTwoFactorMethod({ method: undefined });
  assert.deepEqual(last().body, { method: null }, 'turning it off sends null');
  await api.requestPhoneCode({ phoneNumber: '+919876543210' });
  assert.deepEqual([last().url, last().body], ['/auth/api/request-phone-otp', { phoneNumber: '+919876543210' }]);
  await api.verifyPhoneCode({ code: '1' });
  assert.equal(last().url, '/auth/api/verify-phone-otp');
  await resetUserTwoFactor('u 1');
  assert.deepEqual([last().method, last().url], ['POST', '/auth/api/admin/users/u%201/two-factor/reset']);
});

test('the trusted-device token outlives signing out', async () => {
  const { setTrustToken, getTrustToken, clearAuth, setToken, getToken } = await import('../src/token.js');
  setToken('x');
  setTrustToken('trust-1');
  clearAuth();
  assert.equal(getToken(), null);
  assert.equal(getTrustToken(), 'trust-1');
  setTrustToken(null);
  assert.equal(getTrustToken(), null);
});

test('QR cells: square, the three finder corners dark; the key in fours', async () => {
  const { qrMatrix, groupSecret } = await import('../src/qrCode.js');
  const m = qrMatrix('otpauth://totp/GharArt%20CRM%3Aa%40b.c?secret=JBSWY3DPEHPK3PXP&issuer=GharArt%20CRM');
  const n = m.length;
  assert.ok(n >= 21 && (n - 17) % 4 === 0, 'a QR size: ' + n);
  assert.ok(m.every((row) => row.length === n));
  assert.ok(m[0][0] && m[0][n - 1] && m[n - 1][0], 'finder patterns');
  assert.ok(!m[7][7], 'the separator beside a finder is light');
  assert.equal(groupSecret('JBSWY3DPEHPK3PXP'), 'JBSW Y3DP EHPK 3PXP');
});
