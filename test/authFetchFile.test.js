// authFetchFile: a file behind sign-in comes back as a Blob, with the same
// token as authFetch — and a refusal, which the server writes as JSON, throws
// the same Error.
import test from 'node:test';
import assert from 'node:assert';

test('a file comes back as its bytes, asked for with the token', async () => {
  const store = new Map([['accessToken', 'tok-1']]);
  global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
  const seen = [];
  global.fetch = async (url, options) => {
    seen.push({ url, headers: options.headers });
    if (url.endsWith('/missing')) {
      return new Response(JSON.stringify({ code: 404, message: 'No such file', error: 'No such file' }), {
        status: 404, headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { status: 200, headers: { 'content-type': 'image/png' } });
  };
  const { authFetchFile, configure } = await import('../src/api.js');
  configure({ baseUrl: '' });

  const blob = await authFetchFile('/api/factory/files/orders/a__photo.png');
  assert.equal(blob.type, 'image/png');
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [0x89, 0x50, 0x4e, 0x47]);
  assert.equal(seen[0].headers.Authorization, 'Bearer tok-1');

  await assert.rejects(authFetchFile('/api/factory/files/missing'), (err) => err.status === 404 && err.message === 'No such file');
});
