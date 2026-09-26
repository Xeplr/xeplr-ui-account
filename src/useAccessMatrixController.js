import { useState, useEffect, useMemo, useCallback } from 'react';
import { getRoles, getAccessItems, getUsers, toggleModuleRole, toggleAccessRole, getModuleStates, setModuleState } from './adminApi.js';
import { stateKey, indexStates, roleCellState, overrideCellState, roleChangePlan, needsStoredStates } from './accessStates.js';

var GROUP_FIELDS = {
  apis: 'apiGroup',
  pages: 'uiPagesGroup',
  elements: 'uiElementsGroup',
  menus: 'menuGroup',
};

var TYPES = ['apis', 'pages', 'elements', 'menus'];

var ACTION_ORDER = { view: 0, create: 1, edit: 2, delete: 3 };

function parseModuleGroup(groupValue) {
  if (!groupValue) return null;
  var parts = groupValue.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { module: parts[0], action: parts[1] };
}

/**
 * @param props.workspaces      [{ id, name }] the host app's workspaces, for the
 *                              "Applies to: Workspace" picker. Workspaces live in
 *                              the product (BI), not in the auth service.
 * @param props.loadWorkspaces  async () => [{ id, name }], instead of `workspaces`
 */
export function useAccessMatrixController(props) {
  props = props || {};
  var [roles, setRoles] = useState([]);
  var [rawItems, setRawItems] = useState({ apis: [], pages: [], elements: [], menus: [] });
  var [activeView, setActiveView] = useState('modules');
  var [search, setSearch] = useState('');
  var [uncatSubTab, setUncatSubTab] = useState('apis');
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [saving, setSaving] = useState({});

  // ── who the matrix applies to: roles (the defaults), a workspace, a user ──
  var [appliesTo, setAppliesToState] = useState('role');
  var [scopeId, setScopeIdState] = useState('');
  var [workspaces, setWorkspaces] = useState(props.workspaces || []);
  var [users, setUsers] = useState([]);
  // Stored states for the current scope: { 'reports:view[:roleId]': state }.
  var [storedStates, setStoredStates] = useState({});
  // null = not known yet; false = the server has no access-state routes yet.
  var [statesSupported, setStatesSupported] = useState(null);

  useEffect(function() {
    if (props.workspaces) { setWorkspaces(props.workspaces); return; }
    if (typeof props.loadWorkspaces !== 'function') return;
    var alive = true;
    Promise.resolve(props.loadWorkspaces()).then(function(list) {
      if (alive) setWorkspaces(list || []);
    }).catch(function(err) { if (alive) setError(err.message); });
    return function() { alive = false; };
  }, [props.workspaces, props.loadWorkspaces]);

  async function loadStates(scope, id) {
    if (scope !== 'role' && !id) { setStoredStates({}); return; }
    try {
      var rows = await getModuleStates({ scope: scope, scopeId: scope === 'role' ? null : id });
      setStoredStates(indexStates(rows));
      setStatesSupported(true);
    } catch (err) {
      // No server support yet: roles still work through their mappings, and
      // the design shows a notice rather than pretending overrides exist.
      setStoredStates({});
      setStatesSupported(false);
    }
  }

  useEffect(function() {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      var [rolesData, itemsData] = await Promise.all([getRoles(), getAccessItems()]);
      setRoles(rolesData.filter(function(r) { return r.name !== 'Super Admin'; }));
      setRawItems(itemsData);
      await loadStates(appliesTo, scopeId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── Modules view: aggregate items into module > action > roles ───
  var modules = useMemo(function() {
    var moduleMap = {};

    TYPES.forEach(function(type) {
      var items = rawItems[type] || [];
      var groupField = GROUP_FIELDS[type];

      items.forEach(function(item) {
        var parsed = parseModuleGroup(item[groupField]);
        if (!parsed) return;

        var key = parsed.module;
        if (!moduleMap[key]) moduleMap[key] = {};
        if (!moduleMap[key][parsed.action]) {
          moduleMap[key][parsed.action] = { items: [], roleIds: {} };
        }

        var entry = moduleMap[key][parsed.action];
        entry.items.push({ type: type, item: item });

        // Track which roles have ALL items in this group assigned
        var itemRoleIds = (item.roles || []).map(function(r) { return r.id; });
        roles.forEach(function(role) {
          if (entry.roleIds[role.id] === undefined) entry.roleIds[role.id] = { total: 0, assigned: 0 };
          entry.roleIds[role.id].total++;
          if (itemRoleIds.indexOf(role.id) !== -1) entry.roleIds[role.id].assigned++;
        });
      });
    });

    // Convert to sorted array
    var q = search.toLowerCase();
    var result = Object.keys(moduleMap).sort().filter(function(name) {
      return !q || name.toLowerCase().includes(q);
    }).map(function(name) {
      var actions = Object.keys(moduleMap[name]).sort(function(a, b) {
        var oa = ACTION_ORDER[a] !== undefined ? ACTION_ORDER[a] : 99;
        var ob = ACTION_ORDER[b] !== undefined ? ACTION_ORDER[b] : 99;
        return oa - ob;
      }).map(function(action) {
        var data = moduleMap[name][action];
        return {
          action: action,
          itemCount: data.items.length,
          items: data.items,
          getRoleState: getRoleState,
          // Three-way cell for a role: enabled / disabled / hidden (or partial).
          getCellState: function(roleId) {
            return roleCellState(getRoleState(roleId), storedStates[stateKey(name, action, roleId)]);
          },
          // Three-way cell plus inherit, for the chosen workspace or user.
          getOverrideState: function() {
            return overrideCellState(storedStates[stateKey(name, action)]);
          }
        };
        function getRoleState(roleId) {
          var info = data.roleIds[roleId];
          if (!info || info.total === 0) return 'none';
          if (info.assigned === info.total) return 'all';
          if (info.assigned > 0) return 'partial';
          return 'none';
        }
      });

      return { name: name, actions: actions };
    });

    return result;
  }, [rawItems, roles, search, storedStates]);

  // ─── Uncategorized view: items without module:action group ───
  var uncategorized = useMemo(function() {
    var result = {};
    var q = search.toLowerCase();

    TYPES.forEach(function(type) {
      var items = rawItems[type] || [];
      var groupField = GROUP_FIELDS[type];

      result[type] = items.filter(function(item) {
        var parsed = parseModuleGroup(item[groupField]);
        if (parsed) return false; // categorized, skip
        var matchesSearch = !q || (item.name && item.name.toLowerCase().includes(q));
        return matchesSearch;
      });
    });

    return result;
  }, [rawItems, search]);

  var uncategorizedCount = useMemo(function() {
    var count = 0;
    TYPES.forEach(function(type) { count += (uncategorized[type] || []).length; });
    return count;
  }, [uncategorized]);

  // Grant or revoke a module/action for a role, and mirror it locally.
  async function applyGrant(moduleName, action, roleId, assign) {
    await toggleModuleRole({ module: moduleName, action: action, roleId: roleId, assign: assign });
    setRawItems(function(prev) {
      var updated = {};
      TYPES.forEach(function(type) {
        var groupField = GROUP_FIELDS[type];
        updated[type] = prev[type].map(function(item) {
          var parsed = parseModuleGroup(item[groupField]);
          if (!parsed || parsed.module !== moduleName || parsed.action !== action) return item;

          var newRoles;
          if (assign) {
            var hasRole = item.roles && item.roles.some(function(r) { return r.id === roleId; });
            if (hasRole) return item;
            var role = roles.find(function(r) { return r.id === roleId; });
            newRoles = (item.roles || []).concat(role ? [role] : []);
          } else {
            newRoles = (item.roles || []).filter(function(r) { return r.id !== roleId; });
          }
          return { ...item, roles: newRoles };
        });
      });
      return updated;
    });
  }

  function markSaving(key, on) {
    setSaving(function(prev) { var next = { ...prev }; if (on) next[key] = true; else delete next[key]; return next; });
  }

  // ─── Module toggle (bulk) — kept for designs written before three-way cells ───
  var handleModuleToggle = useCallback(async function(moduleName, action, roleId, currentState) {
    var key = 'module:' + moduleName + ':' + action + ':' + roleId;
    markSaving(key, true);
    try {
      await applyGrant(moduleName, action, roleId, currentState !== 'all');
    } catch (err) {
      setError(err.message);
    } finally {
      markSaving(key, false);
    }
  }, [roles]);

  // ─── Three-way cell change: enabled / disabled / hidden (/ inherit) ───
  //
  // roleId is set for the Roles view and null for a workspace or user.
  var handleStateChange = useCallback(async function(moduleName, action, roleId, nextState) {
    if (needsStoredStates(appliesTo, nextState) && statesSupported === false) {
      setError('The server does not store access states yet, so "' + nextState + '" cannot be saved' +
        (appliesTo === 'role' ? ' for a role.' : ' for a ' + appliesTo + '.') +
        ' Enabled and Hidden on roles work today.');
      return;
    }
    var key = 'module:' + moduleName + ':' + action + ':' + (roleId || appliesTo);
    markSaving(key, true);
    setError('');
    try {
      if (appliesTo === 'role') {
        var plan = roleChangePlan(nextState);
        for (var i = 0; i < plan.length; i++) {
          var step = plan[i];
          if (step.call === 'grant') await applyGrant(moduleName, action, roleId, true);
          else if (step.call === 'revoke') await applyGrant(moduleName, action, roleId, false);
          else if (statesSupported) {
            await setModuleState({ scope: 'role', scopeId: roleId, module: moduleName, action: action, roleId: roleId,
              state: step.call === 'setState' ? step.state : null });
          }
        }
        rememberState(stateKey(moduleName, action, roleId), nextState === 'disabled' ? 'disabled' : null);
      } else {
        await setModuleState({ scope: appliesTo, scopeId: scopeId, module: moduleName, action: action,
          state: nextState === 'inherit' ? null : nextState });
        rememberState(stateKey(moduleName, action), nextState === 'inherit' ? null : nextState);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      markSaving(key, false);
    }
  }, [roles, appliesTo, scopeId, statesSupported]);

  function rememberState(k, state) {
    setStoredStates(function(prev) {
      var next = { ...prev };
      if (state) next[k] = state; else delete next[k];
      return next;
    });
  }

  var setAppliesTo = useCallback(function(scope) {
    setAppliesToState(scope);
    setScopeIdState('');
    setError('');
    if (scope === 'user' && users.length === 0) {
      getUsers().then(function(list) { setUsers(list || []); }).catch(function(err) { setError(err.message); });
    }
    loadStates(scope, '');
  }, [users]);

  var setScopeId = useCallback(function(id) {
    setScopeIdState(id);
    loadStates(appliesTo, id);
  }, [appliesTo]);

  // ─── Single item toggle (for uncategorized) ───
  var handleItemToggle = useCallback(async function(type, itemId, roleId, currentlyAssigned) {
    var key = 'item:' + type + ':' + itemId + ':' + roleId;
    setSaving(function(prev) { var next = { ...prev }; next[key] = true; return next; });

    try {
      await toggleAccessRole({ type: type, itemId: itemId, roleId: roleId, assign: !currentlyAssigned });

      setRawItems(function(prev) {
        var updated = { ...prev };
        updated[type] = prev[type].map(function(item) {
          if (item.id !== itemId) return item;
          var newRoles;
          if (currentlyAssigned) {
            newRoles = item.roles.filter(function(r) { return r.id !== roleId; });
          } else {
            var role = roles.find(function(r) { return r.id === roleId; });
            newRoles = item.roles.concat(role ? [role] : []);
          }
          return { ...item, roles: newRoles };
        });
        return updated;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(function(prev) { var next = { ...prev }; delete next[key]; return next; });
    }
  }, [roles]);

  function isItemAssigned(item, roleId) {
    return item.roles && item.roles.some(function(r) { return r.id === roleId; });
  }

  function isModuleSaving(moduleName, action, roleId) {
    return !!saving['module:' + moduleName + ':' + action + ':' + (roleId || appliesTo)];
  }

  function isItemSaving(type, itemId, roleId) {
    return !!saving['item:' + type + ':' + itemId + ':' + roleId];
  }

  var handleViewChange = useCallback(function(view) {
    setActiveView(view);
    setSearch('');
  }, []);

  return {
    roles,
    modules,
    uncategorized,
    uncategorizedCount,
    uncatSubTab,
    setUncatSubTab,
    activeView,
    setActiveView: handleViewChange,
    search,
    setSearch,
    loading,
    error,
    handleModuleToggle,
    handleStateChange,
    handleItemToggle,
    appliesTo,
    setAppliesTo,
    scopeId,
    setScopeId,
    workspaces,
    users,
    statesSupported,
    isItemAssigned,
    isModuleSaving,
    isItemSaving,
    reload: loadData,
  };
}
