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
