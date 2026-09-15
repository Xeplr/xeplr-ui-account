// MENU KEYS AND LABELS — no React.
//
// An app lists its menu items by KEY (drawerItems: [{ key: 'Tasks', icon, … }]).
// The server says which keys this person may see, what each is CALLED, and in
// what order (access.menuItems — renamed from the app without touching code).
//
// `name` is still accepted as the key, so drawer catalogs written before keys
// existed keep working; with no label from the server, the item's own `label`
// or its key is shown.

/**
 * @param catalog  the app's items: [{ key | name, label?, icon?, … }]
 * @param access   { menus: [keys], menuItems?: [{ name, label, sortOrder }] }
 * @returns the items this person may see, each with `key` and `label`, in the server's order
 */
export function labelMenuItems(catalog, access) {
  var allowed = (access && access.menus) || [];
  var fromServer = {};
  var position = {};
  ((access && access.menuItems) || []).forEach(function(m, i) {
    if (!m || !m.name) return;
    fromServer[m.name] = m.label;
    position[m.name] = i;
  });

  return (catalog || [])
    .map(function(item, i) {
      var key = item.key || item.name;
      return { item: item, key: key, index: i };
    })
    .filter(function(x) { return x.key && allowed.indexOf(x.key) !== -1; })
    .sort(function(a, b) {
      var pa = position[a.key] === undefined ? Infinity : position[a.key];
      var pb = position[b.key] === undefined ? Infinity : position[b.key];
      return pa !== pb ? pa - pb : a.index - b.index;
    })
    .map(function(x) {
      return Object.assign({}, x.item, { key: x.key, label: fromServer[x.key] || x.item.label || x.key });
    });
}
