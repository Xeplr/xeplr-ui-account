import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAccessStrict } from './AccessContext.jsx';
import { authPath } from './authRoutes.jsx';

// The built-in settings-dropdown items — seeded via auth's migrations (menus
// table, see migrations/0006_seed_catalog.sql), not hardcoded here. Maps a
// seeded menu NAME to the authRoutes key it links to. "Admin" is deliberately
// NOT here — the framework's builtin section is Profile/Change Password only;
// an app that wants an Admin link adds it to its own settingsOverrides. Only
// names present in access.menus (role-filtered, computed at login) render.
var BUILTIN_SETTINGS_ITEMS = [
  { menuName: 'Profile', authKey: 'profile' },
  { menuName: 'Change Password', authKey: 'changePassword' }
];
var NOTIFICATIONS_MENU_NAME = 'Notifications';

/**
 * Nav is self-contained by design: it reads access/user from context (which only
 * changes on login/logout/access updates) and owns its OWN open/closed UI state.
 * It never depends on — and never forces a re-render of — whatever page is
 * currently mounted in the app's <Outlet/>. Keep it that way when extending:
 * don't lift this state into the app's layout component.
 *
 * @param {object} props
 * @param {Array<{name:string, icon?:string, clickHandler?:Function, group?:string}>} [props.drawerItems] —
 *   the app's own drawer catalog (each `name` must match a `menus.name` row in
 *   the auth DB). Passing a non-empty array auto-activates the drawer rail —
 *   there's no separate flag. `group` is optional; ungrouped items render
 *   first, grouped ones under their section header (see NavDrawer.jsx).
 *   Role-filtered via access.menus, same mechanism as the settings items.
 * @param {Array<{name:string, path:string}>} [props.settingsOverrides] — the app's
 *   OWN items rendered ABOVE the builtin (Profile/Change Password) section in
 *   the settings dropdown — this is where an "Admin" link belongs now. Each
 *   `name` must match a `menus.name` row you've seeded (in YOUR app's
 *   migrations-auth, not auth's own) — role-filtered via access.menus.
 * @param {{count?:number, onClick?:Function}} [props.notifications] — the app's feed
 *   config. Only takes effect if the user's role grants the "Notifications" menu
 *   (seeded basic-tier, visible to everyone by default) — otherwise the bell is
 *   hidden regardless of what's passed here.
 */
export function useNavController(props) {
  props = props || {};
  var accessCtx = useAccessStrict();
  var access = accessCtx.access || {};
  var allowedMenus = access.menus || [];

  var [accountOpen, setAccountOpen] = useState(false);
  var [drawerOpen, setDrawerOpen] = useState(false);

  var accountRef = useRef(null);

  var toggleAccount = useCallback(function() { setAccountOpen(function(v) { return !v; }); }, []);
  var closeAccount = useCallback(function() { setAccountOpen(false); }, []);
  var toggleDrawer = useCallback(function() { setDrawerOpen(function(v) { return !v; }); }, []);
  var closeDrawer = useCallback(function() { setDrawerOpen(false); }, []);

  // Click-outside for the settings menu only — the drawer closes via its own overlay.
  useEffect(function() {
    if (!accountOpen) return;
    function onDocClick(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) closeAccount();
    }
    document.addEventListener('mousedown', onDocClick);
    return function() { document.removeEventListener('mousedown', onDocClick); };
  }, [accountOpen, closeAccount]);

  // Settings dropdown, in render order: app overrides first, then the fixed
  // builtin section — role-filtered the same way for both.
  var accountItems = useMemo(function() {
    var overrides = (props.settingsOverrides || [])
      .filter(function(item) { return allowedMenus.indexOf(item.name) !== -1; });
    var builtin = BUILTIN_SETTINGS_ITEMS
      .filter(function(item) { return allowedMenus.indexOf(item.menuName) !== -1; })
      .map(function(item) { return { name: item.menuName, path: authPath(item.authKey) }; });
    return overrides.concat(builtin);
  }, [allowedMenus, props.settingsOverrides]);

  var notificationsAllowed = allowedMenus.indexOf(NOTIFICATIONS_MENU_NAME) !== -1;

  // Role-filter the app's own drawer catalog down to what this user can actually see.
  var drawerItems = useMemo(function() {
    var catalog = props.drawerItems || [];
    return catalog.filter(function(m) { return allowedMenus.indexOf(m.name) !== -1; });
  }, [props.drawerItems, allowedMenus]);

  return {
    user: accessCtx.user,
    accountItems: accountItems,
    notifications: notificationsAllowed ? (props.notifications || null) : null,
    logout: accessCtx.logout,

    accountOpen: accountOpen,
    toggleAccount: toggleAccount,
    closeAccount: closeAccount,
    accountRef: accountRef,

    drawerOpen: drawerOpen,
    toggleDrawer: toggleDrawer,
    closeDrawer: closeDrawer,
    drawerItems: drawerItems
  };
}
