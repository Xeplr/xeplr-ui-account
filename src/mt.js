// Frontend counterpart to @xeplr/db's BaseModel.registerMTs() — call this once
// at app boot with the SAME config object (same level keys, names, headers).
// There's no shared runtime package between frontend and backend (by design —
// duplicated by convention); keep one literal config in your own app and
// import it into both boot entry points so it can't drift.
//
//   registerMTs({
//     l1: { name: 'companyId', header: 'x-company-id' },
//     l2: { name: 'workspaceId', header: 'x-workspace-id' }
//   });
//
// This only teaches api.js's authFetch which header to attach for each level
// (read from activeScope.js) — it doesn't validate anything itself.

var SLOT_KEYS = ['l1', 'l2', 'l3', 'l4'];
var _config = { slots: {} };

export function registerMTs(config) {
  config = config || {};
  var slots = {};
  SLOT_KEYS.forEach(function(key) {
    if (config[key]) {
      slots[key] = { name: config[key].name, header: String(config[key].header).toLowerCase() };
    }
  });
  _config = { slots: slots };
}

export function getMtConfig() {
  return { slots: Object.assign({}, _config.slots) };
}
