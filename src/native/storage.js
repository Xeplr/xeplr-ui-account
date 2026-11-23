// WHAT A PHONE APP REMEMBERS — the sign-in (tokens, who, what they may see)
// and the server's address. This package keeps its sign-in in
// `localStorage`, a browser's; a phone has none. So a phone app gets one: the
// same calls, answered from memory at once and written through to the phone's
// own storage (AsyncStorage, private to the app) in the background. It is read
// back into memory once, before anything signs in — hydrateStorage().
//
// AsyncStorage is handed in, not imported: this package does not depend on a
// React Native module, so a web app installs nothing for it.
//
// In a browser (Expo's web build) the real localStorage is left as it is.

const memory = new Map()

/**
 * Reads what was remembered back into memory and puts it where this package
 * looks. Once, at start, before startSession().
 *
 * @param AsyncStorage  @react-native-async-storage/async-storage's default export
 * @param prefix        keys are stored as `<prefix>:<key>` — one per app ("rental-desk")
 * @param web           true in a browser: nothing to do
 */
export async function hydrateStorage({ AsyncStorage, prefix, web = false }) {
  if (web) return
  if (!AsyncStorage) throw new Error('hydrateStorage needs AsyncStorage (@react-native-async-storage/async-storage)')
  if (!prefix) throw new Error('hydrateStorage needs a prefix — the app\'s own, e.g. "rental-desk"')
  const p = prefix + ':'
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(p))
  const pairs = keys.length ? await AsyncStorage.multiGet(keys) : []
  pairs.forEach(([k, v]) => { if (v !== null) memory.set(k.slice(p.length), v) })
  globalThis.localStorage = {
    getItem: (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k, v) => { const s = String(v); memory.set(k, s); AsyncStorage.setItem(p + k, s).catch(() => {}) },
    removeItem: (k) => { memory.delete(k); AsyncStorage.removeItem(p + k).catch(() => {}) },
    clear: () => { const all = [...memory.keys()]; memory.clear(); AsyncStorage.multiRemove(all.map((k) => p + k)).catch(() => {}) },
    key: (i) => [...memory.keys()][i] ?? null,
    get length() { return memory.size }
  }
}

/** The app's own remembered values (not the sign-in's): `remember.get('server')`. */
export const remember = {
  get: (k) => globalThis.localStorage.getItem('app.' + k),
  set: (k, v) => (v === null || v === undefined ? globalThis.localStorage.removeItem('app.' + k) : globalThis.localStorage.setItem('app.' + k, v))
}
