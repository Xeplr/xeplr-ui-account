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
