import { useAccessStrict } from './AccessContext.jsx';

/**
 * AccessGuard — conditionally renders children based on access.
 *
 * Props:
 *   element  - element name to check (from uiElements table)
 *   menu     - menu name to check (from menus table)
 *   page     - page name to check (from uiPages table)
 *   role     - role name to check
 *   fallback - what to render if no access (default: null)
 *
 * Usage:
 *   <AccessGuard element="btn-delete-user">
 *     <button onClick={handleDelete}>Delete User</button>
 *   </AccessGuard>
 *
 *   <AccessGuard menu="admin-nav">
 *     <AdminNavigation />
 *   </AccessGuard>
 *
 *   <AccessGuard role="admin" fallback={<span>No access</span>}>
 *     <AdminTools />
 *   </AccessGuard>
 */
export function AccessGuard({ children, element, menu, page, role, fallback = null }) {
  const { hasElement, hasMenu, hasPage, hasRole } = useAccessStrict();

  if (element && !hasElement(element)) return fallback;
  if (menu && !hasMenu(menu)) return fallback;
  if (page && !hasPage(page)) return fallback;
  if (role && !hasRole(role)) return fallback;

  return children;
}
