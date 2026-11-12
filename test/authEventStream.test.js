// authEventStream: server-sent events from a route behind sign-in, read over
// a real HTTP server — the token goes with the request, each event arrives as
// it is written, a refusal throws like authFetch, and close() ends the request
// on the server too.
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

function storage() {
  const store = new Map([['accessToken', 'tok-1']]);
  return { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
}

test('events split from text, comments dropped, the tail kept for the next chunk', async () => {
  const { parseEventStream } = await import('../src/api.js');
  const out = parseEventStream('event: ready\ndata: {}\n\n: still here\n\ndata: {"a":1}\n\ndata: line one\ndata: line two\n\ndata: {"b"');
  assert.deepEqual(out.events, [{ event: 'ready', data: '{}' }, { event: 'message', data: '{"a":1}' }, { event: 'message', data: 'line one\nline two' }]);
  assert.equal(out.rest, 'data: {"b"');
  assert.deepEqual(parseEventStream('data: x\r\n\r\n').events, [{ event: 'message', data: 'x' }], 'CRLF too');
});

test('a live stream: the token is sent, events arrive as written, close() ends it on the server', async () => {
  global.localStorage = storage();
  let seenAuth = null;
  let serverSawClose = null;
  const server = http.createServer((req, res) => {
    if (req.url === '/refused') { res.writeHead(403, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: 'Access denied: Read logs' })); }
    seenAuth = req.headers.authorization;
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write('event: ready\ndata: {}\n\n');
    let n = 0;
    const t = setInterval(() => { n++; res.write('data: ' + JSON.stringify({ n }) + '\n\n'); }, 20);
    serverSawClose = new Promise((done) => req.on('close', () => { clearInterval(t); done(true); }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const { authEventStream, configure } = await import('../src/api.js');
    configure(base);
    const got = [];
    let opened = false;
    const close = await new Promise((resolve, reject) => {
      const c = authEventStream('/live', {
        onOpen: () => { opened = true; },
        onEvent: (e) => { got.push(e); if (got.filter((x) => x.event === 'message').length === 3) resolve(c); },
        onError: reject
      });
    });
    assert.ok(opened);
    assert.equal(seenAuth, 'Bearer tok-1');
    assert.deepEqual(got[0], { event: 'ready', data: '{}' });
    assert.deepEqual(got.filter((x) => x.event === 'message').slice(0, 3).map((e) => JSON.parse(e.data).n), [1, 2, 3]);
    close();
    assert.equal(await serverSawClose, true, 'the server saw the request end');

    const err = await new Promise((resolve) => authEventStream('/refused', { onError: resolve }));
    assert.equal(err.status, 403);
    assert.match(err.message, /Access denied: Read logs/);
  } finally {
    server.close();
  }
});
