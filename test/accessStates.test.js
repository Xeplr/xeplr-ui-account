import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  STATES, OVERRIDE_STATES, stateKey, indexStates, roleCellState,
  overrideCellState, roleChangePlan, needsStoredStates
} from '../src/accessStates.js'

test('three states for roles, plus inherit for a workspace or user', () => {
  assert.deepEqual(STATES, ['enabled', 'disabled', 'hidden'])
  assert.deepEqual(OVERRIDE_STATES, ['inherit', 'enabled', 'disabled', 'hidden'])
})

test('a role cell follows the grant, and a stored disabled greys a granted one', () => {
  assert.equal(roleCellState('all', undefined), 'enabled')
  assert.equal(roleCellState('none', undefined), 'hidden')
  assert.equal(roleCellState('partial', undefined), 'partial')
  assert.equal(roleCellState('all', 'disabled'), 'disabled')
  assert.equal(roleCellState('none', 'disabled'), 'hidden', 'nothing granted: nothing to show greyed out')
  assert.equal(roleCellState('partial', 'disabled'), 'partial', 'a mixed grant stays visibly mixed')
})

test('a workspace or user cell is its override, else inherit', () => {
  assert.equal(overrideCellState('hidden'), 'hidden')
  assert.equal(overrideCellState(undefined), 'inherit')
  assert.equal(overrideCellState('something-new'), 'inherit', 'an unknown value is never shown as a real state')
})

test('stored states are indexed by module, action and role', () => {
  const idx = indexStates([
    { module: 'reports', action: 'view', roleId: 'r1', state: 'disabled' },
    { module: 'reports', action: 'view', state: 'hidden' },
    { module: 'reports', action: 'edit', state: 'bogus' },
    { action: 'view', state: 'hidden' },
    null
  ])
  assert.deepEqual(idx, { 'reports:view:r1': 'disabled', 'reports:view': 'hidden' })
  assert.equal(stateKey('reports', 'view'), 'reports:view')
  assert.deepEqual(indexStates(undefined), {})
})

test('a role change is a grant or revoke, plus a stored state only for disabled', () => {
  assert.deepEqual(roleChangePlan('enabled'), [{ call: 'grant' }, { call: 'clearState' }])
  assert.deepEqual(roleChangePlan('disabled'), [{ call: 'grant' }, { call: 'setState', state: 'disabled' }])
  assert.deepEqual(roleChangePlan('hidden'), [{ call: 'revoke' }, { call: 'clearState' }])
  assert.throws(() => roleChangePlan('inherit'), /Unknown access state/)
})

test('only disabled roles and every override need the server to store states', () => {
  assert.equal(needsStoredStates('role', 'enabled'), false)
  assert.equal(needsStoredStates('role', 'hidden'), false)
  assert.equal(needsStoredStates('role', 'disabled'), true)
  assert.equal(needsStoredStates('workspace', 'inherit'), true)
  assert.equal(needsStoredStates('user', 'enabled'), true)
})
