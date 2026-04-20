import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getUser } from './token.js';
import { logoutUser } from './api.js';

const AccessContext = createContext(null);

/**
 * AccessProvider — wraps your app to provide access state.
 *
 * On mount, loads access from localStorage (set during login).
 * Provides helpers: hasPage, hasApi, hasMenu, hasElement, hasRole.
 *
 * Usage:
 *   <AccessProvider>
 *     <App />
 *   </AccessProvider>
 */
export function AccessProvider({ children }) {
  const [access, setAccessState] = useState(() => {
    const raw = localStorage.getItem('access');
    return raw ? JSON.parse(raw) : null;
  });

  const [user, setUserState] = useState(() => getUser());
  const [authenticated, setAuthenticated] = useState(() => !!getToken());

  function setAccess(accessObj) {
    if (accessObj) {
      localStorage.setItem('access', JSON.stringify(accessObj));
    } else {
      localStorage.removeItem('access');
    }
    setAccessState(accessObj);
  }

  function setUser(userObj) {
    if (userObj) {
      localStorage.setItem('user', JSON.stringify(userObj));
    } else {
      localStorage.removeItem('user');
    }
    setUserState(userObj);
  }

  function logout() {
    logoutUser(); // clears localStorage + best-effort server-side cleanup
    localStorage.removeItem('access');
    setAccessState(null);
    setUserState(null);
    setAuthenticated(false);
  }

  function onLogin(result) {
    // result = { accessToken, refreshToken, user, access } from login API
    setAuthenticated(true);
    setUser(result.user);
    setAccess(result.access);
  }

  // Access checkers
  function hasPage(pageName) {
    if (!access) return false;
    return access.pages && access.pages.includes(pageName);
  }

  function hasApi(apiName) {
    if (!access) return false;
    return access.apis && access.apis.includes(apiName);
  }

  function hasMenu(menuName) {
    if (!access) return false;
    return access.menus && access.menus.includes(menuName);
  }

  function hasElement(elementName) {
    if (!access) return false;
    return access.elements && access.elements.includes(elementName);
  }

  function hasRole(roleName) {
    if (!access) return false;
    return access.roles && access.roles.includes(roleName);
  }

  const value = {
    user,
    access,
    authenticated,
    onLogin,
    logout,
    setAccess,
    hasPage,
    hasApi,
    hasMenu,
    hasElement,
    hasRole
  };

  return (
    <AccessContext.Provider value={value}>
      {children}
    </AccessContext.Provider>
  );
}

/**
 * Hook to access the auth/access context.
 * Returns null if no AccessProvider is present (safe to call unconditionally).
 */
export function useAccess() {
  return useContext(AccessContext);
}

/**
 * Strict version — throws if no AccessProvider.
 * Use in components that require access control (ProtectedRoute, AccessGuard).
 */
export function useAccessStrict() {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error('useAccessStrict must be used within an <AccessProvider>');
  }
  return ctx;
}
