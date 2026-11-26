// renewSession — the renewal authFetch makes on a 401, for requests that cannot
// go through authFetch (an XHR upload). Against a real HTTP refresh endpoint.
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

test('renewSession stores the fresh tokens, and says no when the refresh is refused', async () => {
  const store = new Map();
  global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
  let accept = true;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const ok = accept && req.url === '/auth/api/refresh' && JSON.parse(body).refreshToken === 'rt-old';
      res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
      res.end(JSON.stringify(ok ? { accessToken: 'at-new', refreshToken: 'rt-new' } : { error: 'expired' }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const { renewSession, configure } = await import('../src/api.js');
    configure('http://127.0.0.1:' + server.address().port);
    localStorage.setItem('accessToken', 'at-old');
    localStorage.setItem('refreshToken', 'rt-old');

    assert.equal(await renewSession(), true);
    assert.equal(localStorage.getItem('accessToken'), 'at-new');
    assert.equal(localStorage.getItem('refreshToken'), 'rt-new');

    accept = false;
    assert.equal(await renewSession(), false, 'a dead session is not renewed');
  } finally {
    server.close();
  }
});
