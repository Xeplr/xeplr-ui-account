import { Navigate } from 'react-router-dom';
import { useAccessStrict } from './AccessContext.jsx';

/**
 * ProtectedRoute — guards a route based on auth and access.
 *
 * Props:
 *   page        - page name to check (from uiPages table). Optional.
 *   roles       - array of role names, user must have at least one. Optional.
 *   loginPath   - redirect path if not authenticated (default: /auth/login)
 *   deniedPath  - redirect path if no access (default: /auth/login)
 *   children    - the page component to render
 *
 * Behavior:
 *   - No token → redirect to loginPath
 *   - page prop set + user doesn't have that page → redirect to deniedPath
 *   - roles prop set + user doesn't have any of those roles → redirect to deniedPath
 *   - Otherwise → render children
 *
 * Usage:
 *   // Any authenticated user
 *   <ProtectedRoute><Dashboard /></ProtectedRoute>
 *
 *   // Must have access to this page (DB-driven)
 *   <ProtectedRoute page="/dashboard"><Dashboard /></ProtectedRoute>
 *
 *   // Must have admin role
 *   <ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  page,
  roles,
  loginPath = '/auth/login',
  deniedPath = '/auth/login'
}) {
  const { authenticated, hasPage, hasRole } = useAccessStrict();

  if (!authenticated) {
    return <Navigate to={loginPath} replace />;
  }

  if (page && !hasPage(page)) {
    return <Navigate to={deniedPath} replace />;
  }

  if (roles && roles.length > 0) {
    const hasAny = roles.some(r => hasRole(r));
    if (!hasAny) {
      return <Navigate to={deniedPath} replace />;
    }
  }

  return children;
}
