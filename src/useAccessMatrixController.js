import { useState, useEffect, useMemo, useCallback } from 'react';
import { getRoles, getAccessItems, toggleModuleRole, toggleAccessRole } from './adminApi.js';

var GROUP_FIELDS = {
  apis: 'apiGroup',
  pages: 'uiPagesGroup',
  elements: 'uiElementsGroup',
  menus: 'menuGroup',
};

var TYPES = ['apis', 'pages', 'elements', 'menus'];

var ACTION_ORDER = { view: 0, edit: 1, delete: 2 };

function parseModuleGroup(groupValue) {
  if (!groupValue) return null;
  var parts = groupValue.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { module: parts[0], action: parts[1] };
}

export function useAccessMatrixController() {
  var [roles, setRoles] = useState([]);
  var [rawItems, setRawItems] = useState({ apis: [], pages: [], elements: [], menus: [] });
  var [activeView, setActiveView] = useState('modules');
  var [search, setSearch] = useState('');
  var [uncatSubTab, setUncatSubTab] = useState('apis');
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [saving, setSaving] = useState({});

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
          getRoleState: function(roleId) {
            var info = data.roleIds[roleId];
            if (!info || info.total === 0) return 'none';
            if (info.assigned === info.total) return 'all';
            if (info.assigned > 0) return 'partial';
            return 'none';
          }
        };
      });

      return { name: name, actions: actions };
    });

    return result;
  }, [rawItems, roles, search]);

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

  // ─── Module toggle (bulk) ───
  var handleModuleToggle = useCallback(async function(moduleName, action, roleId, currentState) {
    var assign = currentState !== 'all';
    var key = 'module:' + moduleName + ':' + action + ':' + roleId;
    setSaving(function(prev) { var next = { ...prev }; next[key] = true; return next; });

    try {
      await toggleModuleRole({ module: moduleName, action: action, roleId: roleId, assign: assign });

      // Optimistic: update local state
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(function(prev) { var next = { ...prev }; delete next[key]; return next; });
    }
  }, [roles]);

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
    return !!saving['module:' + moduleName + ':' + action + ':' + roleId];
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
    handleItemToggle,
    isItemAssigned,
    isModuleSaving,
    isItemSaving,
    reload: loadData,
  };
}
