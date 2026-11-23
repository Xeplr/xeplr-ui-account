// A PHONE APP'S SESSION — the server it talks to, who is signed in, and what
// they may see. No React Native, no Expo: the calls are this package's own
// (api.js, token.js), the same login, tokens and refresh as the website.
//
// One address — the app's own (https://rentals.example.com): sign-in at
// /auth/api and everything else at /api, as on the web, where nginx (or Vite
// locally) sends each to its service. Typed once on the sign-in screen and
// remembered — unless the build names one (builtInServer), when there is no
// address to type at all.
//
//   await hydrateStorage({ AsyncStorage, prefix: 'rental-desk' })
//   startSession({ builtInServer: process.env.EXPO_PUBLIC_SERVER_URL })
//   const { server, signedIn, user, access } = useSession()
import { useSyncExternalStore } from 'react'
import {
  configure, loginUser, logoutUser, setSessionExpiredHandler, getMe,
  getSignInOptions, requestSignInCode, verifySignInCode, sendSecondStepCode, verifySecondStep
} from '../api.js'
import { setToken, setRefreshToken, setUser, getToken, getUser, getTrustToken, setTrustToken } from '../token.js'
import { remember } from './storage.js'

let state = { server: '', signedIn: false, user: null, access: null, builtIn: '' }
const listeners = new Set()
const emit = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }

function readAccess() {
  try { const raw = globalThis.localStorage.getItem('access'); return raw ? JSON.parse(raw) : null } catch { return null }
}
function keepAccess(access) {
  if (access) globalThis.localStorage.setItem('access', JSON.stringify(access))
  else globalThis.localStorage.removeItem('access')
}

/** "rentals.example.com/" → "https://rentals.example.com"; an address with its own http(s):// is kept. */
export function cleanServer(typed) {
  const s = String(typed || '').trim().replace(/\/+$/, '')
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : 'https://' + s
}

/**
 * Once, at start, after hydrateStorage(): where to, and whether someone is
 * signed in.
 *
 * @param builtInServer  the server this build is for (e.g. EXPO_PUBLIC_SERVER_URL). Set, the app
 *                       goes there and nowhere else, and asks for no address.
 * @param suggested      an address to offer when nothing is remembered — while developing, the
 *                       Mac's own (Expo's hostUri and the app's web port).
 */
export function startSession({ builtInServer = '', suggested = '' } = {}) {
  const builtIn = cleanServer(builtInServer)
  const server = builtIn || remember.get('server') || ''
  configure(server)
  setSessionExpiredHandler(() => emit({ signedIn: false, user: null }))
  emit({ server, builtIn, suggested: cleanServer(suggested) || suggested, signedIn: Boolean(server && getToken()), user: getUser(), access: readAccess() })
  // What they may see can change while the app was closed (a role taken away).
  if (state.signedIn) refreshAccess()
}

function at(server) {
  const s = state.builtIn || cleanServer(server)
  if (!s) throw new Error('Type the server\'s address, e.g. rentals.example.com')
  configure(s)
  return s
}

/** Tokens → signed in (server remembered); { secondStep } → handed back to ask. */
function finish(server, result) {
  if (result && result.secondStep) return { secondStep: result.secondStep }
  if (!result || !result.accessToken) throw new Error('The server did not sign you in')
  setToken(result.accessToken)
  setRefreshToken(result.refreshToken)
  if (result.trustToken) setTrustToken(result.trustToken)
  if (result.user) setUser(result.user)
  keepAccess(result.access || null)
  remember.set('server', server)
  emit({ server, signedIn: true, user: result.user || null, access: result.access || null })
  return { signedIn: true }
}

// SIGNING IN, in steps — the website's own: email + password, or a code by
// email / text; then, when the server asks one, the second step. Each answers
// { signedIn: true } or { secondStep: { ticket, method, methods, sentTo, trustDays } }.

/** Which ways in `server` offers: { methods, … }; an older server → password only. */
export async function signInOptions(server) {
  try {
    at(server)
    const o = await getSignInOptions()
    return o && Array.isArray(o.methods) ? o : { methods: ['password'] }
  } catch {
    return { methods: ['password'] }
  }
}

export async function signIn({ server, email, password }) {
  const s = at(server)
  return finish(s, await loginUser({ email: String(email || '').trim(), password, trustToken: getTrustToken() }))
}

/** A sign-in code to { email } or { phoneNumber } — the same answer whether or not an account matched. */
export async function sendSignInCode({ server, email, phoneNumber }) {
  at(server)
  await requestSignInCode({ email: email ? String(email).trim() : undefined, phoneNumber })
}

export async function signInWithCode({ server, email, phoneNumber, code }) {
  const s = at(server)
  return finish(s, await verifySignInCode({ email: email ? String(email).trim() : undefined, phoneNumber, code, trustToken: getTrustToken() }))
}

/** The second step's code again, or by another way ('email' | 'sms'). → { sent, method, sentTo } */
export function sendSecondCode({ ticket, method }) {
  return sendSecondStepCode({ ticket, method })
}

export async function finishSecondStep({ server, ticket, method, code, trustDevice }) {
  return finish(state.builtIn || cleanServer(server), await verifySecondStep({ ticket, method, code, trustDevice }))
}

/** Asks the server again what this person may see — the menu follows. Keeps what it had on a failure. */
export async function refreshAccess() {
  try {
    const me = await getMe()
    if (me && me.access) { keepAccess(me.access); emit({ access: me.access, user: me.user || state.user }) }
    return state.access
  } catch {
    return state.access
  }
}

export function signOut() {
  logoutUser()
  keepAccess(null)
  emit({ signedIn: false, user: null, access: null })
}

/** { server, builtIn, suggested, signedIn, user, access } — re-renders when it changes. */
export function useSession() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state)
}

/** The address to start the sign-in screen with. */
export function startingServer() {
  return state.builtIn || state.server || state.suggested || ''
}
