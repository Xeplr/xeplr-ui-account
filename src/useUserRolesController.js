import { useState, useEffect, useMemo, useCallback } from 'react';
import { getUsers, getRoles, toggleUserRole } from './adminApi.js';
import { saveMasterItem } from './masterApi.js';

export function useUserRolesController() {
  var [users, setUsers] = useState([]);
  var [roles, setRoles] = useState([]);
  var [search, setSearch] = useState('');
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [saving, setSaving] = useState({});
  var [newRoleName, setNewRoleName] = useState('');
  var [creatingRole, setCreatingRole] = useState(false);

  useEffect(function() {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      var [usersData, rolesData] = await Promise.all([getUsers(), getRoles()]);
      setUsers(usersData);
      setRoles(rolesData.filter(function(r) { return r.name !== 'Super Admin'; }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  var filteredUsers = useMemo(function() {
    if (!search.trim()) return users;
    var q = search.toLowerCase();
    return users.filter(function(u) {
      return (u.name && u.name.toLowerCase().includes(q)) ||
             (u.email && u.email.toLowerCase().includes(q));
    });
  }, [users, search]);

  var handleToggle = useCallback(async function(userId, roleId, currentlyAssigned) {
    var key = userId + ':' + roleId;
    setSaving(function(prev) { var next = { ...prev }; next[key] = true; return next; });

    try {
      await toggleUserRole({ userId, roleId, assign: !currentlyAssigned });
      setUsers(function(prev) {
        return prev.map(function(u) {
          if (u.id !== userId) return u;
          var newRoles;
          if (currentlyAssigned) {
            newRoles = u.roles.filter(function(r) { return r.id !== roleId; });
          } else {
            var role = roles.find(function(r) { return r.id === roleId; });
            newRoles = u.roles.concat(role ? [role] : []);
          }
          return { ...u, roles: newRoles };
        });
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(function(prev) { var next = { ...prev }; delete next[key]; return next; });
    }
  }, [roles]);

  // A new role becomes a column here and in the Access Matrix: both read the
  // role list from the server. Creating one is Super Admin only; anyone else
  // gets the server's refusal as the error.
  var createRole = useCallback(async function() {
    var name = newRoleName.trim();
    if (!name) return;
    setCreatingRole(true);
    setError('');
    try {
      var made = await saveMasterItem('roles', { name: name });
      setRoles(function(prev) { return prev.concat([{ id: made.id, name: name }]); });
      setNewRoleName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingRole(false);
    }
  }, [newRoleName]);

  function isAssigned(user, roleId) {
    return user.roles && user.roles.some(function(r) { return r.id === roleId; });
  }

  return {
    users: filteredUsers,
    roles,
    search,
    setSearch,
    loading,
    error,
    saving,
    handleToggle,
    isAssigned,
    newRoleName,
    setNewRoleName,
    creatingRole,
    createRole,
    reload: loadData,
  };
}
