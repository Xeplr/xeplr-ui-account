/**
 * The admin pages, in the order the admin view's tabs show them.
 * One list, read by authRoutes' manifest and by the AdminTabs design, so the
 * tabs and the routes cannot disagree about where a page lives.
 */
export var ADMIN_PAGES = [
  { key: 'userRoles',      label: 'User Roles',      path: '/auth/admin/user-roles' },
  { key: 'accessMatrix',   label: 'Access Matrix',   path: '/auth/admin/access-matrix' },
  { key: 'masterSettings', label: 'Master Settings', path: '/auth/admin/master-settings' }
];
