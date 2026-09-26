import { authFetch } from './api.js';

/**
 * Admin API — model layer for RBAC management.
 * Pure logic, no React dependency.
 */

export function getUsers() {
  return authFetch('/auth/api/admin/users');
}

export function getRoles() {
  return authFetch('/auth/api/admin/roles');
}

export function getAccessItems() {
  return authFetch('/auth/api/admin/access-items');
}

export function toggleUserRole({ userId, roleId, assign }) {
  return authFetch('/auth/api/admin/user-role', {
    method: 'POST',
    body: JSON.stringify({ userId, roleId, assign }),
  });
}

export function toggleAccessRole({ type, itemId, roleId, assign }) {
  return authFetch('/auth/api/admin/access-role', {
    method: 'POST',
    body: JSON.stringify({ type, itemId, roleId, assign }),
  });
}

export function toggleModuleRole({ module, action, roleId, assign }) {
  return authFetch('/auth/api/admin/module-role', {
    method: 'POST',
    body: JSON.stringify({ module, action, roleId, assign }),
  });
}

// ── Access states: enabled / disabled / hidden, per role, workspace or user ──
//
// Server support is being added alongside this UI. Until the auth service has
// these routes, getModuleStates fails and the Access Matrix says so, while
// Enabled / Hidden on roles keep working through module-role above.

/** Stored states for one scope: [{ module, action, roleId?, state }]. scope: 'role' | 'workspace' | 'user'. */
export function getModuleStates({ scope, scopeId }) {
  var q = '?scope=' + encodeURIComponent(scope) + (scopeId ? '&scopeId=' + encodeURIComponent(scopeId) : '');
  return authFetch('/auth/api/admin/module-states' + q);
}

/**
 * Store or clear one state. state: 'enabled' | 'disabled' | 'hidden', or
 * 'inherit' / null to remove the stored state. roleId only for scope 'role'.
 */
export function setModuleState({ scope, scopeId, module, action, roleId, state }) {
  return authFetch('/auth/api/admin/module-state', {
    method: 'POST',
    body: JSON.stringify({ scope, scopeId, module, action, roleId, state }),
  });
}

// ── Menu items: key, label, order, visibility (Super Admin) ──────────────

/** Every menu item, hidden ones included: [{ name, label, shown, sortOrder, isHidden, isPublic }]. */
export function listMenuItems() {
  return authFetch('/auth/api/admin/menu-items');
}

/** Rename / reorder / hide by key: [{ name, label?, sortOrder?, isHidden? }]. */
export function saveMenuItems(items) {
  return authFetch('/auth/api/admin/menu-items', { method: 'POST', body: JSON.stringify({ items }) });
}

/** A new item — e.g. a form added to the menu: { name: key, label }. */
export function addMenuItem(item) {
  return authFetch('/auth/api/admin/menu-items/add', { method: 'POST', body: JSON.stringify(item) });
}

export function removeMenuItem(name) {
  return authFetch('/auth/api/admin/menu-items/remove', { method: 'POST', body: JSON.stringify({ name }) });
}
