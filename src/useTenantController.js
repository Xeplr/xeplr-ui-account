import { useState, useEffect, useCallback } from 'react';
import { getTenants, saveTenant, deleteTenant, getUsers, assignUserTenant } from './adminApi.js';

export function useTenantController(options = {}) {
  var [tenants, setTenants] = useState([]);
  var [users, setUsers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [saving, setSaving] = useState(false);
  var [editingItem, setEditingItem] = useState(null);
  var [editForm, setEditForm] = useState({});
  var [activeTab, setActiveTab] = useState('tenants');
  var [search, setSearch] = useState('');

  var level = options.level || 1;
  var label = options.label || 'Company';
  var labels = options.labels || 'Companies';

  useEffect(function() {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      var [tenantData, userData] = await Promise.all([
        getTenants(level),
        getUsers()
      ]);
      setTenants(tenantData);
      setUsers(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  var filteredTenants = tenants.filter(function(t) {
    if (!search) return true;
    var q = search.toLowerCase();
    return (t.name && t.name.toLowerCase().includes(q)) ||
           (t.code && t.code.toLowerCase().includes(q));
  });

  function startAdd() {
    setEditForm({ name: '', code: '', description: '' });
    setEditingItem('__new__');
  }

  function startEdit(item) {
    setEditForm({ name: item.name, code: item.code || '', description: item.description || '' });
    setEditingItem(item.id);
  }

  function cancelEdit() {
    setEditingItem(null);
    setEditForm({});
  }

  function updateField(key, value) {
    setEditForm(function(prev) { var next = { ...prev }; next[key] = value; return next; });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      var data = { ...editForm, level: level };
      if (editingItem !== '__new__') data.id = editingItem;
      var result = await saveTenant(data);
      if (editingItem === '__new__') {
        data.id = result.id;
        setTenants(function(prev) { return prev.concat([data]); });
      } else {
        setTenants(function(prev) {
          return prev.map(function(t) { return t.id === editingItem ? { ...t, ...data } : t; });
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
      await deleteTenant(id);
      setTenants(function(prev) { return prev.filter(function(t) { return t.id !== id; }); });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignUser(userId, tenantId, currentlyAssigned) {
    setError('');
    try {
      await assignUserTenant({ userId, tenantId, assign: !currentlyAssigned });
      // Reload to get fresh user-tenant mappings
      var userData = await getUsers();
      setUsers(userData);
    } catch (err) {
      setError(err.message);
    }
  }

  function isUserAssignedTenant(user, tenantId) {
    return user.tenants && user.tenants.some(function(t) { return t.id === tenantId; });
  }

  var reload = useCallback(function() { loadData(); }, []);

  return {
    tenants: filteredTenants,
    users,
    loading,
    error,
    saving,
    editingItem,
    editForm,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    level,
    label,
    labels,
    startAdd,
    startEdit,
    cancelEdit,
    updateField,
    handleSave,
    handleDelete,
    handleAssignUser,
    isUserAssignedTenant,
    reload,
  };
}
