import { authFetch } from './api.js';

/**
 * Master Settings API — model layer for managing auth master data.
 * Pure logic, no React dependency.
 */

var TYPES = ['roles', 'apis', 'pages', 'elements', 'menus'];

export function getMasterItems(type) {
  return authFetch('/auth/api/admin/master/' + type);
}

export function saveMasterItem(type, data) {
  return authFetch('/auth/api/admin/master/' + type, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteMasterItem(type, id) {
  return authFetch('/auth/api/admin/master/' + type + '/delete', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export { TYPES as MASTER_TYPES };
