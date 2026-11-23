// Choosing where to work (scopeChoice.js), over real HTTP to a local recorder
// standing where the app's /api/tenants routes would be: the levels listed
// top down, each asked with the one above it as a header; a remembered choice
// kept only while it is still on its list; a list of one chosen for the
// person; adding one; and the choice remembered once it is complete.
import test, { before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; }
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const LEVELS = [{ key: 'l1', label: 'Company' }, { key: 'l2', label: 'Workspace' }];
const COMPANIES = [{ id: 'c1', name: 'Acme' }, { id: 'c2', name: 'Globex' }];
const WORKSPACES = { c1: [{ id: 'w1', name: 'Main' }], c2: [{ id: 'w2', name: 'North' }, { id: 'w3', name: 'South' }] };
let server, seen = [], refuse = false;

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, company: req.headers['x-company-id'] || null, body: body ? JSON.parse(body) : null });
      res.writeHead(refuse ? 500 : 200, { 'content-type': 'application/json' });
      if (refuse) return res.end(JSON.stringify({ message: 'The list could not be read' }));
      if (req.method === 'POST') return res.end(JSON.stringify({ dataArray: [{ id: 'c9', name: JSON.parse(body).name }] }));
      const rows = req.url === '/api/tenants/l1' ? COMPANIES : (WORKSPACES[req.headers['x-company-id']] || []);
      res.end(JSON.stringify({ dataArray: rows }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { configure } = await import('../src/api.js');
  const { registerMTs } = await import('../src/mt.js');
  configure('http://127.0.0.1:' + server.address().port);
  registerMTs({ l1: { name: 'companyId', header: 'x-company-id' }, l2: { name: 'workspaceId', header: 'x-workspace-id' } });
  const { setToken, setUser } = await import('../src/token.js');
  setToken('t'); setUser({ id: 'u1' });
});
after(() => server.close());

const settle = () => new Promise((r) => setTimeout(r, 30));

test('the companies are listed; the workspaces only once a company is chosen, and only its own', async () => {
  const { createScopeChoice, scopeChosen } = await import('../src/scopeChoice.js');
  const { getActiveScope } = await import('../src/activeScope.js');
  const choice = createScopeChoice({ levels: LEVELS });
  let changes = 0;
  const stop = choice.subscribe(() => { changes++; });
  await choice.start();
  let s = choice.getState();
  assert.deepEqual(s.levels.map((l) => [l.key, l.noun, l.enabled]), [['l1', 'company', true], ['l2', 'workspace', false]]);
  assert.deepEqual(s.levels[0].items.map((c) => c.name), ['Acme', 'Globex']);
  assert.equal(s.levels[1].items, null, 'nothing listed under no company');
  assert.equal(s.complete, false);
  assert.equal(choice.finish(), false, 'cannot finish half-way');

  await choice.choose(0, COMPANIES[1]);
  assert.equal(getActiveScope('l1').id, 'c2', 'active at once');
  s = choice.getState();
  assert.equal(seen[seen.length - 1].company, 'c2', 'the workspaces asked for under the company chosen');
  assert.deepEqual(s.levels[1].items.map((w) => w.name), ['North', 'South']);
  assert.equal(s.levels[1].value, null, 'two to choose from: nothing chosen for them');

  await choice.choose(1, WORKSPACES.c2[1]);
  assert.equal(choice.getState().complete, true);
  assert.equal(choice.finish(), true);
  assert.equal(scopeChosen(LEVELS), true);
  assert.ok(changes > 3, 'views are told');
  stop();

  const switching = choice.choose(0, COMPANIES[0]);
  assert.equal(getActiveScope('l2'), null, 'a different company: the workspace below it is cleared at once');
  await switching;
  assert.equal(choice.getState().levels[1].value.id, 'w1', 'a list of one is chosen for the person');
  assert.equal(getActiveScope('l2').id, 'w1');
});

test('opening again: the last choice, kept only while it is still on its list', async () => {
  const { createScopeChoice } = await import('../src/scopeChoice.js');
  const { setActiveScope, clearActiveScope } = await import('../src/activeScope.js');
  clearActiveScope();
  const remembered = createScopeChoice({ levels: LEVELS });
  await remembered.start();
  await settle();
  assert.equal(remembered.getState().levels[0].value.id, 'c2', 'the last company, from finish()');

  setActiveScope('l1', { id: 'gone', name: 'Closed Co' });
  const stale = createScopeChoice({ levels: LEVELS });
  await stale.start();
  await settle();
  assert.equal(stale.getState().levels[0].value, null, 'a company no longer on the list is not a choice');
});

test('adding a company: created, put on the list in order, chosen; a blank name sends nothing', async () => {
  const { createScopeChoice } = await import('../src/scopeChoice.js');
  const choice = createScopeChoice({ levels: LEVELS });
  await choice.start();
  const before = seen.length;
  assert.equal(await choice.add(0), null);
  assert.equal(seen.length, before, 'nothing sent for a blank name');
  choice.setAdding(0, '  Zenith  ');
  const created = await choice.add(0);
  assert.deepEqual(seen.filter((x) => x.method === 'POST').pop().body, { name: 'Zenith' });
  const s = choice.getState();
  assert.equal(created.id, 'c9');
  assert.equal(s.levels[0].value.id, 'c9');
  assert.equal(s.levels[0].adding, '');
  assert.deepEqual(s.levels[0].items.map((c) => c.name), ['Acme', 'Globex', 'Zenith']);
});

test('a server that refuses: the message on the level, nothing chosen', async () => {
  const { createScopeChoice } = await import('../src/scopeChoice.js');
  const { clearActiveScope } = await import('../src/activeScope.js');
  clearActiveScope();
  refuse = true;
  const choice = createScopeChoice({ levels: [LEVELS[0]] });
  await choice.start();
  await settle();
  assert.match(choice.getState().levels[0].error, /could not be read/);
  choice.setAdding(0, 'X');
  assert.equal(await choice.add(0), null);
  assert.match(choice.getState().levels[0].error, /could not be read/);
  refuse = false;
});
