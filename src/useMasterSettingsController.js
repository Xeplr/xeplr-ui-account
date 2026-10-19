import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUrlParams } from '@xeplr/ui-utils/src/url/useUrlState.js';
import { adminUrlKey, oneOf, findItem, blankForm, itemForm, NEW_ITEM } from './adminUrlState.js';
import { getMasterItems, saveMasterItem, deleteMasterItem, setApiScope } from './masterApi.js';
import { useAccess } from './AccessContext.jsx';

var TABS = [
  { key: 'roles', label: 'Roles', fields: [{ key: 'name', label: 'Name', required: true }] },
  { key: 'apis', label: 'APIs', fields: [
    { key: 'name', label: 'Name', required: true },
    { key: 'apiGroup', label: 'Group', type: 'group', placeholder: 'e.g. account:view' },
    { key: 'isPublic', label: 'Public', type: 'boolean' }
  ]},
  { key: 'pages', label: 'Pages', fields: [
    { key: 'name', label: 'Name', required: true },
    { key: 'uiPagesGroup', label: 'Group', type: 'group', placeholder: 'e.g. account:view' },
    { key: 'isPublic', label: 'Public', type: 'boolean' }
  ]},
  { key: 'elements', label: 'Elements', fields: [
    { key: 'name', label: 'Name', required: true },
    { key: 'uiElementsGroup', label: 'Group', type: 'group', placeholder: 'e.g. users:edit' }
  ]},
  { key: 'menus', label: 'Menus', fields: [
    { key: 'name', label: 'Name', required: true },
    { key: 'menuGroup', label: 'Group', type: 'group', placeholder: 'e.g. reports:view' },
    { key: 'isPublic', label: 'Public', type: 'boolean' }
  ]},
];

var TAB_KEYS = TABS.map(function(t) { return t.key; });

/**
 * @param options.urlKey  where the tab and the row being edited live in the
 *                        URL: by default `tab` and `item`; a prefix ('ms' →
 *                        msTab, msItem) when the host's own keys could
 *                        collide; `false` keeps both in memory.
 */
export function useMasterSettingsController(options) {
  options = options || {};
  // ── Where you are: the tab, and the row being edited (its id, or NEW_ITEM
  // for the add row). Switching tabs replaces the history entry; opening or
  // closing an editor adds one, so Back closes it.
  var tabKey = adminUrlKey(options.urlKey, 'tab') || 'tab';
  var itemKey = adminUrlKey(options.urlKey, 'item') || 'item';
  var urlDefaults = useMemo(function() { var d = {}; d[tabKey] = 'roles'; return d; }, [tabKey]);
  var url = useUrlParams(urlDefaults, { inUrl: options.urlKey !== false });
  var activeTab = oneOf(url.get(tabKey), TAB_KEYS, 'roles');
  var editingValue = url.get(itemKey);

  var [items, setItems] = useState({});
  var [search, setSearch] = useState('');
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [saving, setSaving] = useState(false);
  // The form being typed is not a place: it stays here, tied to the row it
  // was started for, and is rebuilt from the row whenever an editor opens.
  var [draft, setDraft] = useState({ at: null, form: null });
  var [scopeSaving, setScopeSaving] = useState({});

  // Only Super Admin sees the "Super Admin only" switch at all; the server
  // refuses the change for anyone else anyway.
  var access = useAccess();
  var isSuperAdmin = !!(access && access.hasRole && access.hasRole('Super Admin'));

  useEffect(function() {
    loadItems(activeTab);
  }, [activeTab]);

  async function loadItems(type) {
    setLoading(true);
    setError('');
    try {
      var data = await getMasterItems(type);
      setItems(function(prev) { var next = { ...prev }; next[type] = data; return next; });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  var currentTab = TABS.find(function(t) { return t.key === activeTab; }) || TABS[0];

  // The row the URL names, once this tab's rows have loaded.
  var editing = findItem(items[activeTab], editingValue);
  var editingItem = editing === NEW_ITEM ? NEW_ITEM : (editing ? editing.id : null);
  var draftAt = editing ? activeTab + ':' + editingValue : null;
  var openForm = editing === NEW_ITEM ? blankForm(currentTab.fields) : (editing ? itemForm(currentTab.fields, editing) : {});
  var editForm = draftAt && draft.at === draftAt ? draft.form : openForm;

  function openEditor(value) {
    var patch = {};
    patch[itemKey] = value;
    setDraft({ at: null, form: null });
    url.set(patch);
  }

  var GROUP_FIELDS = { apis: 'apiGroup', pages: 'uiPagesGroup', elements: 'uiElementsGroup', menus: 'menuGroup' };

  var groupNames = useMemo(function() {
    var set = {};
    ['apis', 'pages', 'elements', 'menus'].forEach(function(type) {
      var field = GROUP_FIELDS[type];
      (items[type] || []).forEach(function(item) {
        var val = item[field];
        if (val && val.indexOf(':') !== -1) set[val] = true;
      });
    });
    return Object.keys(set).sort();
  }, [items]);

  var filteredItems = useMemo(function() {
    var list = items[activeTab] || [];
    // Hide Super Admin from roles tab
    if (activeTab === 'roles') {
      list = list.filter(function(item) { return item.name !== 'Super Admin'; });
    }
    if (!search.trim()) return list;
    var q = search.toLowerCase();
    return list.filter(function(item) {
      return Object.values(item).some(function(val) {
        return val && String(val).toLowerCase().includes(q);
      });
    });
  }, [items, activeTab, search]);

  var setUrl = url.set;
  var handleTabChange = useCallback(function(nextTab) {
    var patch = {};
    patch[tabKey] = nextTab;
    patch[itemKey] = null;
    setUrl(patch, { replace: true });
    setSearch('');
    setDraft({ at: null, form: null });
  }, [setUrl, tabKey, itemKey]);

  function startAdd() {
    openEditor(NEW_ITEM);
  }

  function startEdit(item) {
    openEditor(item.id);
  }

  function cancelEdit() {
    openEditor(null);
  }

  function updateField(fieldKey, value) {
    if (!draftAt) return;
    setDraft(function(prev) {
      var next = { ...(prev.at === draftAt ? prev.form : openForm) };
      next[fieldKey] = value;
      return { at: draftAt, form: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      var data = { ...editForm };
      if (editingItem !== NEW_ITEM) {
        data.id = editingItem;
      }
      var result = await saveMasterItem(activeTab, data);

      if (editingItem === NEW_ITEM) {
        data.id = result.id;
        setItems(function(prev) {
          var next = { ...prev };
          next[activeTab] = (next[activeTab] || []).concat([data]);
          return next;
        });
      } else {
        setItems(function(prev) {
          var next = { ...prev };
          next[activeTab] = (next[activeTab] || []).map(function(item) {
            if (item.id !== editingItem) return item;
            return { ...item, ...data };
          });
          return next;
        });
      }

      openEditor(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Move an API in or out of system scope. Effective at once on the server.
  async function handleScopeToggle(item) {
    var next = item.scope === 'system' ? 'company' : 'system';
    setScopeSaving(function(prev) { var n = { ...prev }; n[item.id] = true; return n; });
    setError('');
    try {
      await setApiScope(item.id, next);
      setItems(function(prev) {
        var n = { ...prev };
        n.apis = (n.apis || []).map(function(x) { return x.id === item.id ? { ...x, scope: next } : x; });
        return n;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setScopeSaving(function(prev) { var n = { ...prev }; delete n[item.id]; return n; });
    }
  }

  function isScopeSaving(id) { return !!scopeSaving[id]; }

  async function handleDelete(id) {
    setSaving(true);
    setError('');
    try {
      await deleteMasterItem(activeTab, id);
      setItems(function(prev) {
        var next = { ...prev };
        next[activeTab] = (next[activeTab] || []).filter(function(item) { return item.id !== id; });
        return next;
      });
      if (editingItem === id) openEditor(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    tabs: TABS,
    activeTab,
    setActiveTab: handleTabChange,
    currentTab,
    items: filteredItems,
    groupNames,
    search,
    setSearch,
    loading,
    error,
    saving,
    editingItem,
    editForm,
    startAdd,
    startEdit,
    cancelEdit,
    updateField,
    handleSave,
    handleDelete,
    isSuperAdmin,
    handleScopeToggle,
    isScopeSaving,
    reload: function() { loadItems(activeTab); },
  };
}
