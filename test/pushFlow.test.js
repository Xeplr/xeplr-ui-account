// Switching push notifications on and off in a browser, end to end through
// push.js and authFetch: a stand-in browser (service worker, PushManager,
// Notification, storage) and a stand-in server (fetch), so every state and
// every step is checked without a real phone.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const KEY = 'AQID_-8'                          // a public key, as the server hands it
const KEY_BYTES = [1, 2, 3, 255, 239]
const OTHER_KEY = new Uint8Array([9, 9, 9]).buffer

let server, calls, store, sub, permission, granted, registered

function json(data, status = 200) {
  return new Response(JSON.stringify({ code: status === 200 ? 'SUCCESS' : 'ERR', message: '', dataArray: data === undefined ? [] : [data] }), { status, headers: { 'content-type': 'application/json' } })
}

function fakeSubscription(endpoint, keyBuffer) {
  return {
    endpoint,
    options: { applicationServerKey: keyBuffer },
    toJSON: () => ({ endpoint, keys: { p256dh: 'BPk', auth: 'xyz' } }),
    unsubscribe: async () => { if (sub && sub.endpoint === endpoint) sub = null; return true }
  }
}

beforeEach(() => {
  calls = []
  server = { enabled: true, on: false }
  sub = null
  permission = 'default'
  granted = 'granted'
  registered = []
  const items = new Map()
  store = items
  global.localStorage = { getItem: (k) => (items.has(k) ? items.get(k) : null), setItem: (k, v) => items.set(k, String(v)), removeItem: (k) => items.delete(k) }
  global.window = { localStorage: global.localStorage, PushManager: function() {}, Notification: function() {}, matchMedia: () => ({ matches: false }) }
  const pushManager = {
    getSubscription: async () => sub,
    subscribe: async ({ applicationServerKey }) => { sub = fakeSubscription('https://push.example/new', applicationServerKey.buffer); return sub }
  }
  const registration = { pushManager }
  Object.defineProperty(global, 'navigator', { configurable: true, value: {
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130',
    serviceWorker: {
      register: async (url, opts) => { registered.push([url, opts]); return registration },
      ready: Promise.resolve(registration),
      getRegistration: async () => (registered.length || sub ? registration : undefined)
    }
  } })
  global.Notification = { get permission() { return permission }, requestPermission: async () => { permission = granted; return granted } }
  global.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null, keepalive: options.keepalive })
    if (url.endsWith('/key')) return json({ enabled: server.enabled, publicKey: server.enabled ? KEY : null })
    if (url.includes('/device?endpoint=')) return json({ on: server.on })
    if (url.endsWith('/subscribe')) { server.on = true; return json({ on: true }) }
    if (url.endsWith('/unsubscribe')) { server.on = false; return json({ on: false }) }
    return json(undefined, 404)
  }
})

const load = () => import('../src/push.js')

test('where a device stands: unsupported, install, unavailable, blocked, off, on', async () => {
  const { pushStatus } = await load()
  const opts = { apiBase: '/api/push' }
  const savedSW = navigator.serviceWorker
  navigator.serviceWorker = undefined
  assert.equal(await pushStatus(opts), 'unsupported')
  navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)'
  assert.equal(await pushStatus(opts), 'install')
  navigator.serviceWorker = savedSW
  navigator.userAgent = 'Mozilla/5.0 (Linux; Android 14) Chrome/130'
  server.enabled = false
  assert.equal(await pushStatus(opts), 'unavailable')
  server.enabled = true
  permission = 'denied'
  assert.equal(await pushStatus(opts), 'blocked')
  permission = 'granted'
  assert.equal(await pushStatus(opts), 'off', 'no subscription in this browser')
  sub = fakeSubscription('https://push.example/1', new Uint8Array(KEY_BYTES).buffer)
  assert.equal(await pushStatus(opts), 'off', 'subscribed here, but not for this person on the server')
  server.on = true
  assert.equal(await pushStatus(opts), 'on')
  assert.ok(calls.some((c) => c.url === '/api/push/device?endpoint=' + encodeURIComponent('https://push.example/1')))
})

test('switching on: the worker at the root, the question asked, subscribed with the server\'s key, the server told, remembered', async () => {
  const { enablePush } = await load()
  assert.equal(await enablePush({ apiBase: '/api/push', workerUrl: '/xeplr-push-sw.js?icon=/i.png' }), 'on')
  assert.deepEqual(registered[0], ['/xeplr-push-sw.js?icon=/i.png', { scope: '/' }])
  assert.deepEqual(Array.from(new Uint8Array(sub.options.applicationServerKey)), KEY_BYTES)
  const told = calls.find((c) => c.url === '/api/push/subscribe')
  assert.deepEqual(told.body, { subscription: { endpoint: 'https://push.example/new', keys: { p256dh: 'BPk', auth: 'xyz' } } })
  assert.deepEqual(JSON.parse(store.get('xeplr-push')), { apiBase: '/api/push', endpoint: 'https://push.example/new' })
})

test('switching on: "no" to the question is blocked; no keys on the server is unavailable; old keys start again', async () => {
  const { enablePush } = await load()
  granted = 'denied'
  assert.equal(await enablePush({ apiBase: '/api/push' }), 'blocked')
  assert.ok(!calls.some((c) => c.url.endsWith('/subscribe')))
  granted = 'granted'
  server.enabled = false
  assert.equal(await enablePush({ apiBase: '/api/push' }), 'unavailable')
  server.enabled = true
  sub = fakeSubscription('https://push.example/old', OTHER_KEY)
  assert.equal(await enablePush({ apiBase: '/api/push' }), 'on')
  assert.equal(sub.endpoint, 'https://push.example/new', 'subscribed with other keys: dropped and made again')
  sub = fakeSubscription('https://push.example/same', new Uint8Array(KEY_BYTES).buffer)
  assert.equal(await enablePush({ apiBase: '/api/push' }), 'on')
  assert.equal(sub.endpoint, 'https://push.example/same', 'the same keys: kept')
})

test('switching off: the server forgets it and the browser drops it; nothing subscribed is just off', async () => {
  const { enablePush, disablePush } = await load()
  await enablePush({ apiBase: '/api/push' })
  assert.equal(await disablePush({ apiBase: '/api/push' }), 'off')
  assert.deepEqual(calls.find((c) => c.url === '/api/push/unsubscribe').body, { endpoint: 'https://push.example/new' })
  assert.equal(sub, null)
  assert.equal(store.has('xeplr-push'), false)
  calls = []
  assert.equal(await disablePush({ apiBase: '/api/push' }), 'off')
  assert.equal(calls.length, 0)
})

test('signing out switches the device off at once, and never throws; nothing remembered, nothing sent', async () => {
  const { enablePush, forgetPushDevice } = await load()
  forgetPushDevice()
  assert.equal(calls.length, 0)
  await enablePush({ apiBase: '/api/push' })
  calls = []
  forgetPushDevice()
  assert.equal(calls.length, 1, 'the server call starts before the token is cleared')
  assert.deepEqual([calls[0].url, calls[0].keepalive, calls[0].body], ['/api/push/unsubscribe', true, { endpoint: 'https://push.example/new' }])
  assert.equal(store.has('xeplr-push'), false)
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(sub, null, 'the browser drops it too')
  global.fetch = async () => { throw new Error('offline') }
  store.set('xeplr-push', JSON.stringify({ apiBase: '/api/push', endpoint: 'x' }))
  assert.doesNotThrow(() => forgetPushDevice())
})
