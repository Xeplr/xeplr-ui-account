// CHOOSING WHERE TO WORK — the company (and workspace, …) an app's data
// belongs to, picked after signing in. The picking itself, once, for every
// view of it: the website's picker page and a phone app's are drawn
// differently and decide nothing.
//
//   const choice = createScopeChoice({ levels: tenancy.levels })
//   choice.start()                     // the active or last choice, made active; lists load
//   choice.getState()                  // { levels: [{ key, label, noun, enabled, items, error, value, adding, busy }], complete }
//   choice.choose(0, item)             // a level chosen: active at once, every level under it cleared
//   choice.setAdding(0, 'Acme'); await choice.add(0)   // a new one, created and chosen
//   choice.finish()                    // every level chosen: active, and remembered as the last choice
//
// Each level's list comes from the app (`list(levelKey)`), asked with the
// levels above it already active — authFetch sends them as headers, so the
// server answers only that company's workspaces. A remembered choice no
// longer on its list is dropped; a list of one is chosen for the person.
// The default list / add are the app's own /api/tenants/<level> routes, the
// ones @xeplr/cli writes.
//
// No React: subscribe / getState, so a view is a few lines (useScopeChoice).
import { getActiveScope, setActiveScope, getLastScope, setLastScope } from './activeScope.js';
import { authFetch } from './api.js';

function defaultList(key) {
  return authFetch('/api/tenants/' + key).then(function(body) { return (body && body.dataArray) || []; });
}
function defaultAdd(key, name) {
  return authFetch('/api/tenants/' + key, { method: 'POST', body: JSON.stringify({ name: name }) })
    .then(function(body) { return body.dataArray[0]; });
}

export function createScopeChoice({ levels, list = defaultList, add = defaultAdd }) {
  const keys = (levels || []).map(function(l) { return l.key; });
  const per = {};
  keys.forEach(function(k) { per[k] = { items: null, error: null, value: null, adding: '', busy: false }; });
  const listeners = new Set();
  let state = null;

  function compute() {
    let above = true;
    state = {
      complete: keys.length > 0 && keys.every(function(k) { return per[k].value; }),
      levels: (levels || []).map(function(l) {
        const p = per[l.key];
        const enabled = above;
        above = above && Boolean(p.value);
        return Object.assign({}, l, { noun: String(l.label || l.key).toLowerCase(), enabled: enabled }, p);
      })
    };
    listeners.forEach(function(fn) { fn(); });
  }

  // Lists only the levels whose parents are chosen; each answer that arrives
  // after the choice above it changed is thrown away.
  let asked = {};
  function load(index) {
    const key = keys[index];
    if (!key || !state.levels[index].enabled) return Promise.resolve();
    const ticket = asked[key] = {};
    per[key].items = null;
    per[key].error = null;
    compute();
    return Promise.resolve().then(function() { return list(key); }).then(function(rows) {
      if (asked[key] !== ticket) return;
      per[key].items = rows || [];
      const value = per[key].value;
      if (value && !per[key].items.some(function(r) { return r.id === value.id; })) return choose(index, null);
      if (!value && per[key].items.length === 1) return choose(index, per[key].items[0]);
      compute();
    }, function(err) {
      if (asked[key] !== ticket) return;
      per[key].error = err.message || 'Could not list them';
      compute();
    });
  }

  /** A level chosen (or cleared): active at once, so the level under it lists this one's children. */
  function choose(index, item) {
    const key = keys[index];
    per[key].value = item || null;
    setActiveScope(key, item || null);
    keys.slice(index + 1).forEach(function(k) {
      per[k].value = null;
      per[k].items = null;
      setActiveScope(k, null);
    });
    compute();
    return item ? load(index + 1) : Promise.resolve();
  }

  compute();
  return {
    getState: function() { return state; },
    subscribe: function(fn) { listeners.add(fn); return function() { listeners.delete(fn); }; },

    /** The active (or the signed-in person's last) choice, made active straight away; then the lists. */
    start: function() {
      keys.forEach(function(k) {
        per[k].value = getActiveScope(k) || getLastScope(k) || null;
        setActiveScope(k, per[k].value);
      });
      compute();
      return keys.reduce(function(p, k, i) { return p.then(function() { return load(i); }); }, Promise.resolve());
    },

    choose: choose,

    setAdding: function(index, text) { per[keys[index]].adding = text; compute(); },

    /** A new one at this level, with the name being typed: created, put on the list, chosen. */
    add: function(index) {
      const key = keys[index];
      const name = String(per[key].adding || '').trim();
      if (!name) return Promise.resolve(null);
      per[key].busy = true;
      compute();
      return Promise.resolve().then(function() { return add(key, name); }).then(function(created) {
        per[key].items = (per[key].items || []).concat([created]).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
        per[key].adding = '';
        per[key].error = null;
        per[key].busy = false;
        return choose(index, created).then(function() { return created; });
      }, function(err) {
        per[key].error = err.message || 'Could not add it';
        per[key].busy = false;
        compute();
        return null;
      });
    },

    /** Every level chosen: made active and remembered as this person's last choice. False when one is missing. */
    finish: function() {
      if (!state.complete) return false;
      keys.forEach(function(k) { setActiveScope(k, per[k].value); setLastScope(k, per[k].value); });
      return true;
    }
  };
}

/** Every level has an active choice — the app may show its pages. */
export function scopeChosen(levels) {
  return (levels || []).length > 0 && levels.every(function(l) { return getActiveScope(l.key); });
}
