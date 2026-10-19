import { test } from 'node:test'
import assert from 'node:assert/strict'
import { patchSearch, readSearch } from '@xeplr/ui-utils/src/url/urlState.js'
import { adminUrlKey, oneOf, findItem, blankForm, itemForm, NEW_ITEM } from '../src/adminUrlState.js'

test('plain keys by default, prefixed for a host, none when kept in memory', () => {
  assert.equal(adminUrlKey(undefined, 'tab'), 'tab')
  assert.equal(adminUrlKey('', 'item'), 'item')
  assert.equal(adminUrlKey('ms', 'tab'), 'msTab')
  assert.equal(adminUrlKey('am', 'uncat'), 'amUncat')
  assert.equal(adminUrlKey(false, 'view'), null)
})

test('a value from the URL is used only when it is a known one', () => {
  assert.equal(oneOf('menus', ['roles', 'menus'], 'roles'), 'menus')
  assert.equal(oneOf('drop-table', ['roles', 'menus'], 'roles'), 'roles', 'an edited link never reaches the API as a type')
  assert.equal(oneOf(null, ['roles'], 'roles'), 'roles')
})

test('the row being edited is found by id, a number read back as a string', () => {
  const rows = [{ id: 7, name: 'Viewer' }, { id: 'abc', name: 'Creator' }]
  assert.equal(findItem(rows, '7'), rows[0])
  assert.equal(findItem(rows, 'abc'), rows[1])
  assert.equal(findItem(rows, NEW_ITEM), NEW_ITEM)
})

test('nothing open: no value, rows not loaded yet, or the row is gone', () => {
  assert.equal(findItem([{ id: 1 }], null), null)
  assert.equal(findItem([{ id: 1 }], ''), null)
  assert.equal(findItem(undefined, '1'), null)
  assert.equal(findItem([null, { id: 2 }], '1'), null)
})

test('the add form is blank, booleans off', () => {
  const fields = [{ key: 'name' }, { key: 'isPublic', type: 'boolean' }]
  assert.deepEqual(blankForm(fields), { name: '', isPublic: 0 })
})

test('the edit form is the row\'s value for every field of the tab, and only those', () => {
  const fields = [{ key: 'name' }, { key: 'apiGroup' }, { key: 'isPublic', type: 'boolean' }]
  assert.deepEqual(itemForm(fields, { id: 3, name: 'GET /x', isPublic: 1, extra: 'no' }),
    { name: 'GET /x', apiGroup: '', isPublic: 1 })
})

test('an edited row and its tab survive the query string', () => {
  const q = patchSearch('?other=1', { [adminUrlKey('ms', 'tab')]: 'apis', [adminUrlKey('ms', 'item')]: 12 })
  const back = new URLSearchParams(q.toString())
  assert.equal(readSearch(back, 'msTab'), 'apis')
  assert.equal(findItem([{ id: 12 }], readSearch(back, 'msItem')).id, 12)
  assert.equal(readSearch(back, 'other'), '1', 'the host\'s own keys are left alone')
})
