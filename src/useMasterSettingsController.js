import { useState, useEffect, useMemo, useCallback } from 'react';
import { getMasterItems, saveMasterItem, deleteMasterItem } from './masterApi.js';

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

export function useMasterSettingsController() {
  var [activeTab, setActiveTab] = useState('roles');
  var [items, setItems] = useState({});
  var [search, setSearch] = useState('');
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [saving, setSaving] = useState(false);
  var [editingItem, setEditingItem] = useState(null);
  var [editForm, setEditForm] = useState({});

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

  var handleTabChange = useCallback(function(tabKey) {
    setActiveTab(tabKey);
    setSearch('');
    setEditingItem(null);
    setEditForm({});
  }, []);

  function startAdd() {
    var empty = {};
    currentTab.fields.forEach(function(f) {
      empty[f.key] = f.type === 'boolean' ? 0 : '';
    });
    setEditingItem('__new__');
    setEditForm(empty);
  }

  function startEdit(item) {
    var form = {};
    currentTab.fields.forEach(function(f) {
      form[f.key] = item[f.key] !== undefined ? item[f.key] : '';
    });
    setEditingItem(item.id);
    setEditForm(form);
  }

  function cancelEdit() {
    setEditingItem(null);
    setEditForm({});
  }

  function updateField(fieldKey, value) {
    setEditForm(function(prev) { var next = { ...prev }; next[fieldKey] = value; return next; });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      var data = { ...editForm };
      if (editingItem !== '__new__') {
        data.id = editingItem;
      }
      var result = await saveMasterItem(activeTab, data);

      if (editingItem === '__new__') {
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

      setEditingItem(null);
      setEditForm({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

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
      if (editingItem === id) {
        setEditingItem(null);
        setEditForm({});
      }
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
    reload: function() { loadItems(activeTab); },
  };
}
