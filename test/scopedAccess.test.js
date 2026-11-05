// What a person may see depends on the company they have open: the creator of
// a company is its CompanyAdmin there and a Viewer elsewhere. getMe asks auth
// as the user is in that company (x-verify-tenant), and a company change is
// announced so AccessProvider can ask again.
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
const target = new EventTarget();
global.window = target;
const sent = [];
let refuseTenant = false;
global.fetch = async (url, options) => {
  sent.push(options.headers);
  const named = options.headers['x-verify-tenant'];
  if (named && refuseTenant) {
    return new Response(JSON.stringify({ error: 'Not a member', code: 'NOT_A_MEMBER' }), { status: 403, headers: { 'content-type': 'application/json' } });
  }
  const roles = named ? ['Viewer', 'CompanyAdmin'] : ['Viewer'];
  return new Response(JSON.stringify({ user: { id: 'u1' }, access: { roles } }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const { getMe, configure } = await import('../src/api.js');
const { registerMTs } = await import('../src/mt.js');
const { setActiveScope, clearActiveScope, SCOPE_CHANGED_EVENT } = await import('../src/activeScope.js');
configure({ baseUrl: '' });
registerMTs({ l1: { name: 'companyId', header: 'x-company-id' }, l2: { name: 'workspaceId', header: 'x-workspace-id' } });

test('with nothing open, /me is asked for the user\'s own roles', async () => {
  const me = await getMe();
  assert.equal(sent.at(-1)['x-verify-tenant'], undefined);
  assert.deepEqual(me.access.roles, ['Viewer']);
});

test('with a company and workspace open, /me is asked as the user is there', async () => {
  setActiveScope('l1', { id: 'own', name: 'Own Co' });
  setActiveScope('l2', { id: 'w1' });
  const me = await getMe();
  assert.deepEqual(JSON.parse(sent.at(-1)['x-verify-tenant']), { l1: 'own', l2: 'w1' });
  assert.deepEqual(me.access.roles, ['Viewer', 'CompanyAdmin']);
});

test('a company that is not theirs: their own roles, not a failure', async () => {
  refuseTenant = true;
  try {
    const me = await getMe();
    assert.deepEqual(me.access.roles, ['Viewer']);
    assert.equal(sent.at(-1)['x-verify-tenant'], undefined, 'asked again without the company');
  } finally { refuseTenant = false; }
});

test('a change of company is announced; the same company again is not', () => {
  const heard = [];
  const listen = (e) => heard.push(e.detail.level);
  target.addEventListener(SCOPE_CHANGED_EVENT, listen);
  try {
    setActiveScope('l1', { id: 'own', name: 'Renamed' });
    assert.deepEqual(heard, [], 'same id, a new name');
    setActiveScope('l1', { id: 'other' });
    setActiveScope('l2', null);
    assert.deepEqual(heard, ['l1', 'l2']);
    clearActiveScope();
    assert.deepEqual(heard, ['l1', 'l2', 'l1'], 'only what was set is cleared');
  } finally { target.removeEventListener(SCOPE_CHANGED_EVENT, listen); }
});
