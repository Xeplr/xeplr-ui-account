/**
 * Where you are on an admin page lives in the URL — model layer.
 * Pure logic, no React dependency.
 *
 * The admin pages are routes of their own (see authRoutes), so their tabs and
 * the record being edited are places: a refresh or a shared link must land on
 * the same tab with the same row open. These are the query keys they use and
 * how a value read back from the URL is made safe to use.
 *
 * Keys: the plain names below by default. A host can prefix them
 * (`urlKey: 'ms'` → msTab, msItem) when it renders a page somewhere its own
 * keys could collide, or pass `urlKey: false` to keep the state in memory.
 */

export var NEW_ITEM = '__new__';

/**
 * The query key for `name`, given the host's `urlKey`.
 *   undefined → 'tab'     'ms' → 'msTab'     false → null (in memory)
 */
export function adminUrlKey(urlKey, name) {
  if (urlKey === false) return null;
  if (!urlKey) return name;
  return urlKey + name.charAt(0).toUpperCase() + name.slice(1);
}

/** A value from the URL, only if it is one of `allowed`; else the fallback. */
export function oneOf(value, allowed, fallback) {
  return allowed.indexOf(value) !== -1 ? value : fallback;
}

/**
 * The item a URL value names, by id. The URL holds a string and an id may be
 * a number, so they compare as strings. NEW_ITEM names the add row.
 */
export function findItem(items, value) {
  if (value === null || value === undefined || value === '') return null;
  if (value === NEW_ITEM) return NEW_ITEM;
  var list = items || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && String(list[i].id) === String(value)) return list[i];
  }
  return null;
}

/** The empty add form for a tab's fields: booleans 0, everything else ''. */
export function blankForm(fields) {
  var form = {};
  fields.forEach(function(f) { form[f.key] = f.type === 'boolean' ? 0 : ''; });
  return form;
}

/** The edit form for an item: its value for every field of the tab. */
export function itemForm(fields, item) {
  var form = {};
  fields.forEach(function(f) { form[f.key] = item[f.key] !== undefined ? item[f.key] : ''; });
  return form;
}
