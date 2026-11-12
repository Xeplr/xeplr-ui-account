import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pushSupport, keyBytes, PUSH_STATES, PUSH_WORKER_PATH } from '../src/push.js'

const ANDROID = { navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130', serviceWorker: {} }, window: { PushManager: function() {}, Notification: function() {} } }
const IPHONE_TAB = { navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari', serviceWorker: {} }, window: { matchMedia: () => ({ matches: false }) } }
const IPHONE_APP = { navigator: { userAgent: IPHONE_TAB.navigator.userAgent, serviceWorker: {}, standalone: true }, window: { PushManager: function() {}, Notification: function() {}, matchMedia: () => ({ matches: true }) } }

test('which browsers can: Android yes; an iPhone only from the Home Screen app', () => {
  assert.deepEqual(pushSupport(ANDROID), { supported: true, needsInstall: false })
  assert.deepEqual(pushSupport(IPHONE_TAB), { supported: false, needsInstall: true })
  assert.deepEqual(pushSupport(IPHONE_APP), { supported: true, needsInstall: false })
  assert.deepEqual(pushSupport({ navigator: {}, window: {} }), { supported: false, needsInstall: false })
})

test('a VAPID key becomes the bytes the browser subscribes with', () => {
  const bytes = keyBytes('AQID_-8')
  assert.deepEqual(Array.from(bytes), [1, 2, 3, 255, 239])
})

test('the states and where the worker lives', () => {
  assert.deepEqual(PUSH_STATES, ['unsupported', 'install', 'unavailable', 'blocked', 'off', 'on'])
  assert.equal(PUSH_WORKER_PATH, '/xeplr-push-sw.js')
})
