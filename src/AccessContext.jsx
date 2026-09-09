import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { getToken, getUser } from './token.js';
import { logoutUser, getMe, setSessionExpiredHandler } from './api.js';

const AccessContext = createContext(null);

/**
 * AccessProvider — wraps your app to provide access state.
 *
 * Seeds from localStorage (written at login) and then RE-READS IT FROM THE
 * SERVER on mount. Provides helpers: hasPage, hasApi, hasMenu, hasElement,
 * hasRole.
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

  // ── re-read access from the server ──────────────────────────────────
  //
  // WHAT THIS FIXES. `access` was written to localStorage at login and read
  // once, here, forever after. So it was a snapshot of what the user could see
  // at the moment they signed in — and nothing on the server could change it.
  // Seed a menu, grant a role, take a page away: none of it reached a
  // signed-in browser until that person happened to log out, which could be
  // weeks. Restarting the API did not help, because the API was never the
  // thing holding the stale copy.
  //
  // It went unnoticed because the failure is silent in exactly the wrong
  // direction: useNavController drops a drawer item whose name is not in
  // `access.menus` without an error, so a new page simply is not in the rail
  // and nothing anywhere says why.
  //
  // ON MOUNT, which on a SPA means once per full page load. That is the
  // shortest honest promise: a change lands on next reload rather than next
  // login.
  /**
   * Ask the server again. Also exposed on the context, so a screen that CHANGES
   * access can show its own effect — the access matrix is the obvious one: an
   * admin who grants a role and sees nothing happen has no way to tell a saved
   * change from a broken one.
   *
   * Resolves either way. A caller awaiting it is waiting for "we tried", not
   * for "it worked" — there is nothing useful for a nav bar to do about a
   * failed refresh except carry on with what it had.
   */
  async function refreshAccess() {
    try {
      const result = await getMe();
      if (!result) return null;
      // REPLACED, not merged. Access is the whole answer to "what may this
      // person see", and merging would keep a page that has just been revoked
      // — the direction you least want to be wrong in.
      if (result.access) setAccess(result.access);
      if (result.user) setUser(result.user);
      return result.access || null;
    } catch (err) {
      // KEEP WHAT WE HAVE. A network blip, a restarting API, a laptop that woke
      // up on a train — none of those mean the user lost their permissions, and
      // blanking `access` would empty the nav and bounce them out of the page
      // they were reading. A genuinely dead session is handled separately, by
      // the setSessionExpiredHandler(logout) effect below.
      //
      // But silently keeping stale state used to mean silently keeping the
      // user in the dark too — this used to fail with zero indication
      // anything was wrong. Still don't blank anything; just say so.
      raiseSnackbar(err.message || 'Could not reach the server to refresh your access.', { design: 'error' });
      return null;
    }
  }

  // A dead session (refresh token missing, or rejected) is discovered inside
  // authFetch — outside React entirely — which can wipe localStorage but has
  // no way to flip THIS component's `authenticated` state on its own. Without
  // this, clearAuth() runs and nothing downstream ever notices: ProtectedRoute
  // keeps reading a stale `authenticated: true` and the app just sits there
  // throwing errors on every call instead of bouncing to login.
  useEffect(() => {
    setSessionExpiredHandler(logout);
    return () => setSessionExpiredHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshedRef = useRef(false);
  useEffect(() => {
    // Nothing to refresh for a signed-out visitor, and asking would be a 401 on
    // every login screen.
    if (!authenticated) return;
    // StrictMode double-invokes effects in development. One request, not two.
    // Not reset on logout either: signing back in goes through onLogin, which
    // already carries fresh access from the login response.
    if (refreshedRef.current) return;
    refreshedRef.current = true;
    refreshAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

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
    refreshAccess,
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
