// PUSH NOTIFICATIONS ON THIS DEVICE — the model: no React.
//
// The server side is @xeplr/push, mounted by the app (e.g. at /api/push). This
// file switches THIS browser on or off there, and says where it stands:
//
//   unsupported   this browser cannot show push notifications
//   install       an iPhone / iPad in a Safari tab: add the app to the Home
//                 Screen first and open it from there (iOS 16.4+)
//   unavailable   the server has no push keys — nothing to offer
//   blocked       the person (or the phone's settings) blocked notifications
//   off           can be switched on
//   on            switched on, for the person signed in
//
// The service worker (sw/xeplr-push-sw.js, served at the site's root by the
// app — see vite.js) shows each notification and opens the app on a tap.
import { authFetch } from './api.js';

export var PUSH_STATES = Object.freeze(['unsupported', 'install', 'unavailable', 'blocked', 'off', 'on']);
export var PUSH_WORKER_PATH = '/xeplr-push-sw.js';

// Remembered so signing out can switch this device off (logout knows no apiBase).
var STORE_KEY = 'xeplr-push';

function first(body) {
  return body && Array.isArray(body.dataArray) ? body.dataArray[0] || {} : {};
}

function remember(value) {
  try {
    if (value) window.localStorage.setItem(STORE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORE_KEY);
  } catch (e) { /* storage blocked: sign-out just will not switch it off */ }
}

function remembered() {
  try { return JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
}

/**
 * What this browser can do. `env` is for tests: { navigator, window }.
 * @returns {{ supported: boolean, needsInstall: boolean }}
 */
export function pushSupport(env) {
  var nav = (env && env.navigator) || (typeof navigator !== 'undefined' ? navigator : {});
  var win = (env && env.window) || (typeof window !== 'undefined' ? window : {});
  var ua = String(nav.userAgent || '');
  var ios = /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  var standalone = Boolean(nav.standalone) || Boolean(win.matchMedia && win.matchMedia('(display-mode: standalone)').matches);
  var supported = Boolean(nav.serviceWorker) && 'PushManager' in win && 'Notification' in win;
  return { supported: supported, needsInstall: ios && !standalone };
}

/** A VAPID public key (URL-safe base64) as the bytes PushManager.subscribe takes. */
export function keyBytes(base64) {
  var padded = String(base64 || '').replace(/-/g, '+').replace(/_/g, '/');
  padded += '='.repeat((4 - (padded.length % 4)) % 4);
  var raw = atob(padded);
  var out = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(workerUrl) {
  var reg = await navigator.serviceWorker.register(workerUrl || PUSH_WORKER_PATH, { scope: '/' });
  await navigator.serviceWorker.ready;
  return reg;
}

async function currentSubscription() {
  if (!navigator.serviceWorker) return null;
  var reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

/**
 * Where this device stands, for the person signed in.
 * @param {{ apiBase: string }} options  where @xeplr/push's routes are, e.g. '/api/push'
 * @returns {Promise<string>} one of PUSH_STATES
 */
export async function pushStatus(options) {
  var can = pushSupport();
  if (!can.supported) return can.needsInstall ? 'install' : 'unsupported';
  var key = first(await authFetch(options.apiBase + '/key'));
  if (!key.enabled) return 'unavailable';
  if (Notification.permission === 'denied') return 'blocked';
  var sub = await currentSubscription();
  if (!sub) return 'off';
  var device = first(await authFetch(options.apiBase + '/device?endpoint=' + encodeURIComponent(sub.endpoint)));
  return device.on ? 'on' : 'off';
}

/**
 * Switch this device on: the service worker, the person's permission (asked
 * now — so call it from a tap, which is the only time a phone allows the
 * question), the subscription, and the server told.
 * @param {{ apiBase: string, workerUrl?: string }} options
 * @returns {Promise<string>} 'on', or 'blocked' when the person said no
 */
export async function enablePush(options) {
  var reg = await registration(options.workerUrl);
  var permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'blocked';
  var key = first(await authFetch(options.apiBase + '/key'));
  if (!key.enabled) return 'unavailable';
  var wanted = keyBytes(key.publicKey);
  var sub = await reg.pushManager.getSubscription();
  // Subscribed before with other keys (the server's were changed): start again.
  if (sub && sub.options && sub.options.applicationServerKey && !sameBytes(new Uint8Array(sub.options.applicationServerKey), wanted)) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: wanted });
  await authFetch(options.apiBase + '/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
  remember({ apiBase: options.apiBase, endpoint: sub.endpoint });
  return 'on';
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Switch this device off: the server forgets it, and the browser drops it.
 * @param {{ apiBase: string }} options
 */
export async function disablePush(options) {
  var sub = await currentSubscription();
  if (sub) {
    await authFetch(options.apiBase + '/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
  }
  remember(null);
  return 'off';
}

/**
 * Signing out: this device stops getting the person's notifications. Starts
 * the server call at once, while the sign-in is still there (call it BEFORE
 * the token is cleared), and never waits or throws.
 */
export function forgetPushDevice() {
  var saved = remembered();
  if (!saved || !saved.apiBase || !saved.endpoint) return;
  remember(null);
  authFetch(saved.apiBase + '/unsubscribe', { method: 'POST', keepalive: true, body: JSON.stringify({ endpoint: saved.endpoint }) }).catch(function() {});
  currentSubscription().then(function(sub) { return sub && sub.unsubscribe(); }).catch(function() {});
}
