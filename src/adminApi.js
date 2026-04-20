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

// ─── Tenant management (Super Admin) ───

export function getTenants(level) {
  var url = '/auth/api/admin/tenants';
  if (level) url += '?level=' + level;
  return authFetch(url);
}

export function saveTenant(data) {
  return authFetch('/auth/api/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteTenant(id) {
  return authFetch('/auth/api/admin/tenants/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export function assignUserTenant({ userId, tenantId, level }) {
  return authFetch('/auth/api/admin/tenants/assign-user', {
    method: 'POST',
    body: JSON.stringify({ userId, tenantId, level }),
  });
}
