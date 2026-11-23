// A phone app's session (src/native): the server address as typed, and the
// storage a phone gets in place of a browser's localStorage.
import test from 'node:test';
import assert from 'node:assert';

test('a server address is cleaned the way people type it', async () => {
  const { cleanServer } = await import('../src/native/session.js');
  assert.equal(cleanServer('rentals.example.com/'), 'https://rentals.example.com');
  assert.equal(cleanServer(' http://192.168.1.20:19300 '), 'http://192.168.1.20:19300');
  assert.equal(cleanServer(''), '');
});

test('a phone gets a localStorage: answered from memory, written through, read back at start', async () => {
  const saved = new Map([['rental-desk:token', 'abc'], ['other-app:token', 'not ours']]);
  const AsyncStorage = {
    getAllKeys: async () => [...saved.keys()],
    multiGet: async (keys) => keys.map((k) => [k, saved.get(k)]),
    setItem: async (k, v) => { saved.set(k, v); },
    removeItem: async (k) => { saved.delete(k); },
    multiRemove: async (ks) => { ks.forEach((k) => saved.delete(k)); }
  };
  const { hydrateStorage } = await import('../src/native/storage.js');
  await hydrateStorage({ AsyncStorage, prefix: 'rental-desk' });
  assert.equal(globalThis.localStorage.getItem('token'), 'abc', 'read back');
  assert.equal(globalThis.localStorage.getItem('other-app:token'), null, 'only this app\'s');
  globalThis.localStorage.setItem('user', '{"id":1}');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(saved.get('rental-desk:user'), '{"id":1}', 'written through');
  await assert.rejects(hydrateStorage({ prefix: 'x' }), /AsyncStorage/);
  delete globalThis.localStorage;
});
