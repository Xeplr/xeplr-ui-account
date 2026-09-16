// authFetch and the body it is given: JSON gets a JSON header, a FormData does
// not — declaring a type over multipart loses the boundary, and with it the file.
import test from 'node:test';
import assert from 'node:assert';

test('a FormData body keeps the browser\'s own content type', async () => {
  const store = new Map();
  global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
  const seen = [];
  global.fetch = async (url, options) => {
    seen.push(options.headers);
    return new Response(JSON.stringify({ code: 200, message: 'ok', dataArray: [] }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  };
  global.FormData = global.FormData || class FormData {};
  const { authFetch, configure } = await import('../src/api.js');
  configure({ baseUrl: '' });

  await authFetch('/x', { method: 'POST', body: JSON.stringify({ a: 1 }) });
  assert.equal(seen[0]['Content-Type'], 'application/json');

  await authFetch('/x', { method: 'POST', body: new FormData() });
  assert.equal(seen[1]['Content-Type'], undefined);

  await authFetch('/x', { method: 'POST', body: new FormData(), headers: { 'Content-Type': 'text/plain' } });
  assert.equal(seen[2]['Content-Type'], 'text/plain', 'a caller may still say what it is sending');
});
