// A company left open in this browser that the signed-in person is not in —
// another account's, or one they were removed from. It must not trap them:
// the first refusal drops it, a read is asked again without it, and the
// remembered "last company" is only ever given back to whoever picked it.
import test from 'node:test';
import assert from 'node:assert';

const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; }
};
global.window = new EventTarget();
const sent = [];
global.fetch = async (url, options) => {
  sent.push({ url, method: options.method || 'GET', company: options.headers['x-company-id'], workspace: options.headers['x-workspace-id'] });
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  if (options.headers['x-company-id'] === 'theirs') return json(403, { code: 'NOT_A_MEMBER', error: 'Not a member of l1 "theirs"' });
  if (options.headers['x-workspace-id'] === 'gone') return json(403, { code: 'NOT_A_MEMBER', error: 'Not a member of l2 "gone"' });
  return json(200, { dataArray: [{ id: 'mine' }] });
};

const { authFetch, configure } = await import('../src/api.js');
const { registerMTs } = await import('../src/mt.js');
const { setActiveScope, getActiveScope, setLastScope, getLastScope } = await import('../src/activeScope.js');
const { setUser } = await import('../src/token.js');
configure({ baseUrl: '' });
registerMTs({ l1: { name: 'companyId', header: 'x-company-id' }, l2: { name: 'workspaceId', header: 'x-workspace-id' } });

test('a read refused for a company not theirs is asked again without it, and the company is dropped', async () => {
  setActiveScope('l1', { id: 'theirs' });
  setActiveScope('l2', { id: 'w' });
  const out = await authFetch('/companies?limit=0');
  assert.deepEqual(out.dataArray, [{ id: 'mine' }]);
  assert.equal(sent.at(-1).company, undefined, 'the retry names no company');
  assert.equal(sent.at(-1).workspace, undefined, '...nor its workspace');
  assert.equal(getActiveScope('l1'), null);
  assert.equal(getActiveScope('l2'), null);
});

test('a write is not retried, but the next one goes out clean', async () => {
  setActiveScope('l1', { id: 'theirs' });
  await assert.rejects(authFetch('/companies/save', { method: 'POST', body: '[]' }), (e) => e.code === 'NOT_A_MEMBER');
  const count = sent.length;
  await authFetch('/companies/save', { method: 'POST', body: '[]' });
  assert.equal(sent.length, count + 1);
  assert.equal(sent.at(-1).company, undefined);
});

test('a workspace not theirs drops the workspace only', async () => {
  setActiveScope('l1', { id: 'mine' });
  setActiveScope('l2', { id: 'gone' });
  await authFetch('/workspaces');
  assert.equal(sent.at(-1).company, 'mine');
  assert.equal(sent.at(-1).workspace, undefined);
  assert.deepEqual(getActiveScope('l1'), { id: 'mine' });
  assert.equal(getActiveScope('l2'), null);
});

test('the last company is given back only to whoever picked it', () => {
  setUser({ id: 'u1' });
  setLastScope('l1', { id: 'google' });
  assert.deepEqual(getLastScope('l1'), { id: 'google' });
  setUser({ id: 'u2' });
  assert.equal(getLastScope('l1'), null, 'another account never resumes it');
  store.set('xeplr:lastScope:l1', JSON.stringify({ id: 'old' }));
  assert.equal(getLastScope('l1'), null, 'an entry from before it was owned is nobody\'s');
});
