import { test } from 'node:test'
import assert from 'node:assert/strict'
import { labelMenuItems } from '../src/menuLabels.js'

const catalog = [
  { key: 'Home', icon: 'h' },
  { key: 'Tasks', icon: 't' },
  { name: 'Reports', icon: 'r' },          // written before keys existed
  { key: 'Secret' },
  { key: 'form:crop', label: 'Crop' }
]

test('matched by key, shown by the server\'s label, in the server\'s order', () => {
  const access = {
    menus: ['Tasks', 'Home', 'Reports', 'form:crop'],
    menuItems: [{ name: 'Tasks', label: 'TSK' }, { name: 'Home', label: 'Home' }, { name: 'Reports', label: 'Reports' }]
  }
  const items = labelMenuItems(catalog, access)
  assert.deepEqual(items.map((i) => [i.key, i.label]), [['Tasks', 'TSK'], ['Home', 'Home'], ['Reports', 'Reports'], ['form:crop', 'Crop']])
  assert.equal(items[0].icon, 't', 'the rest of the item is kept')
})

test('an older access answer with names only: the item\'s own label, else its key, in catalog order', () => {
  const items = labelMenuItems(catalog, { menus: ['Reports', 'Home'] })
  assert.deepEqual(items.map((i) => [i.key, i.label]), [['Home', 'Home'], ['Reports', 'Reports']])
})

test('nothing allowed, nothing given', () => {
  assert.deepEqual(labelMenuItems(catalog, {}), [])
  assert.deepEqual(labelMenuItems(undefined, undefined), [])
  assert.deepEqual(labelMenuItems([{ icon: 'no key' }, null && {}].filter(Boolean), { menus: ['x'], menuItems: [null, { label: 'no name' }] }), [])
})
