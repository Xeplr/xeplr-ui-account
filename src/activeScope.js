const STORAGE_PREFIX = 'xeplr:activeScope:';

/**
 * Fired on window when a level's active value changes (a different id, or
 * cleared): { detail: { level } }. AccessProvider listens and re-reads access,
 * because what a person may see depends on the company they are in — the
 * creator of a company is its admin there and a Viewer everywhere else.
 * Setting the same id again (a name refreshed) fires nothing.
 */
export const SCOPE_CHANGED_EVENT = 'xeplr:activeScopeChanged';

function announce(level) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(SCOPE_CHANGED_EVENT, { detail: { level } }));
    }
  } catch (e) {}
}

/**
 * The app's active value at a given MT level (l1, l2, ...) — e.g. the current
 * company at l1, workspace at l2. Auth doesn't know or care what it means:
 * it's a bare value per level, mirroring how userTenantsMapping stores a bare
 * {level, value} row server-side. api.js's authFetch reads this (per the
 * level's header, from registerMTs() — see mt.js) and attaches it to every
 * request.
 *
 *   setActiveScope('l1', { id: 'acme-co', name: 'Acme Co' });
 *   getActiveScope('l1');   // => { id: 'acme-co', name: 'Acme Co' }
 */
export function getActiveScope(level) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + level);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setActiveScope(level, scope) {
  const before = (getActiveScope(level) || {}).id || null;
  try {
    if (scope) localStorage.setItem(STORAGE_PREFIX + level, JSON.stringify(scope));
    else localStorage.removeItem(STORAGE_PREFIX + level);
  } catch (e) {}
  if (before !== ((scope && scope.id) || null)) announce(level);
}

/**
 * The active scope as auth's x-verify-tenant reads it — { l1: '<id>', l2: … }
 * for every level registered with registerMTs() that has a value; null when
 * none has.
 */
export function activeTenants(levels) {
  const tenants = {};
  (levels || []).forEach(function(level) {
    const scope = getActiveScope(level);
    if (scope && scope.id) tenants[level] = String(scope.id);
  });
  return Object.keys(tenants).length ? tenants : null;
}

const LAST_STORAGE_PREFIX = 'xeplr:lastScope:';

/**
 * The last value set at a given level, independent of the ACTIVE scope above
 * and deliberately untouched by clearActiveScope() — so an app can offer to
 * resume the same company/workspace after a logout without silently
 * bypassing whatever cleared the active scope. A caller decides whether and
 * how to re-verify eligibility before trusting this; auth doesn't.
 */
export function getLastScope(level) {
  try {
    const raw = localStorage.getItem(LAST_STORAGE_PREFIX + level);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setLastScope(level, scope) {
  try {
    if (scope) localStorage.setItem(LAST_STORAGE_PREFIX + level, JSON.stringify(scope));
    else localStorage.removeItem(LAST_STORAGE_PREFIX + level);
  } catch (e) {}
}

/**
 * Clear one level's scope, or every level if omitted (e.g. on logout).
 */
export function clearActiveScope(level) {
  if (level) {
    setActiveScope(level, null);
    return;
  }
  try {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(STORAGE_PREFIX) === 0) keys.push(key);
    }
    keys.forEach(function(key) { localStorage.removeItem(key); });
    keys.forEach(function(key) { announce(key.slice(STORAGE_PREFIX.length)); });
  } catch (e) {}
}
