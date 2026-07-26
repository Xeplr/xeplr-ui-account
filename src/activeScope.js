const STORAGE_PREFIX = 'xeplr:activeScope:';

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
  try {
    if (scope) localStorage.setItem(STORAGE_PREFIX + level, JSON.stringify(scope));
    else localStorage.removeItem(STORAGE_PREFIX + level);
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
  } catch (e) {}
}
