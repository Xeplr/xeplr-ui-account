import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { labelMenuItems } from './menuLabels.js';
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

// ── drawer width ────────────────────────────────────────────────────────
// Only the EXPANDED drawer is resizable. Collapsed is a 60px icon rail whose
// width is the icon's, not a preference — there is nothing in it to give room
// to, so nav.css keeps owning that number.
//
// The width is remembered because re-dragging it on every page load is the
// whole reason a fixed width was annoying enough to change. Kept per browser
// (localStorage) rather than on the user record: it is a property of the
// screen you are sitting at, and the same account on a laptop and a wide
// monitor wants two different answers.
var DRAWER_WIDTH_KEY = 'xeplr-nav-drawer-width';
var DRAWER_WIDTH_DEFAULT = 240;
// Floors and ceilings, not taste. Below MIN the labels this width exists to
// show start truncating, so the expanded state stops being different from the
// collapsed one; past MAX the nav is competing with the page for the screen.
var DRAWER_WIDTH_MIN = 180;
var DRAWER_WIDTH_MAX = 480;
// What an arrow key moves. Big enough to get somewhere, small enough to land.
var DRAWER_WIDTH_STEP = 16;

// Frozen module constant, so the identity is stable across renders and a
// memoized View is not re-rendered by a fresh object every time.
var DRAWER_WIDTH_BOUNDS = {
  min: DRAWER_WIDTH_MIN,
  max: DRAWER_WIDTH_MAX,
  step: DRAWER_WIDTH_STEP,
  default: DRAWER_WIDTH_DEFAULT
};

// Only NaN falls back to the default — ±Infinity is deliberately allowed
// through, because Math.min/max turn it into exactly the near/far stop, which
// is what the Home/End keys pass in.
function clampDrawerWidth(px) {
  if (typeof px !== 'number' || isNaN(px)) return DRAWER_WIDTH_DEFAULT;
  return Math.min(DRAWER_WIDTH_MAX, Math.max(DRAWER_WIDTH_MIN, Math.round(px)));
}

// Wrapped because localStorage THROWS rather than returning null in Safari
// private mode and under a blocked-cookies policy — an unguarded read here
// would take the whole nav down at first render.
function readStoredDrawerWidth() {
  try {
    var raw = window.localStorage.getItem(DRAWER_WIDTH_KEY);
    if (!raw) return DRAWER_WIDTH_DEFAULT;
    return clampDrawerWidth(parseInt(raw, 10));
  } catch (err) {
    return DRAWER_WIDTH_DEFAULT;
  }
}

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

  // Lazy initialiser (function, not value) so localStorage is read ONCE on
  // mount instead of on every render.
  var [drawerWidth, setDrawerWidth] = useState(readStoredDrawerWidth);
  var [drawerResizing, setDrawerResizing] = useState(false);

  var accountRef = useRef(null);

  var toggleAccount = useCallback(function() { setAccountOpen(function(v) { return !v; }); }, []);
  var closeAccount = useCallback(function() { setAccountOpen(false); }, []);
  var toggleDrawer = useCallback(function() { setDrawerOpen(function(v) { return !v; }); }, []);
  var closeDrawer = useCallback(function() { setDrawerOpen(false); }, []);

  // ── resizing ──────────────────────────────────────────────────────────
  // The handle only starts the gesture; the move/end listeners go on the
  // DOCUMENT (below), not the handle, because a drag routinely outruns a 6px
  // strip — listening on the handle alone would drop the gesture the moment
  // the pointer got ahead of the edge, which is most of the time.
  var startDrawerResize = useCallback(function(e) {
    // Stops the browser starting a text/image selection drag instead, which
    // would leave the page blue-highlighted for the whole gesture.
    if (e && e.preventDefault) e.preventDefault();
    setDrawerResizing(true);
  }, []);

  var resetDrawerWidth = useCallback(function() {
    setDrawerWidth(DRAWER_WIDTH_DEFAULT);
  }, []);

  // Keyboard equivalent of the drag — the handle is focusable, so a resize
  // must be reachable without a pointer at all.
  var nudgeDrawerWidth = useCallback(function(delta) {
    setDrawerWidth(function(w) { return clampDrawerWidth(w + delta); });
  }, []);

  useEffect(function() {
    if (!drawerResizing) return;
    // The drawer is `position: fixed; left: 0`, so the pointer's viewport x IS
    // the width being dragged to — no offset bookkeeping needed.
    function onMove(e) { setDrawerWidth(clampDrawerWidth(e.clientX)); }
    function onUp() { setDrawerResizing(false); }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    // pointercancel fires when the browser takes the gesture away (touch
    // scroll taking over, window losing focus). Without it the drag would
    // never end and every later mouse move would keep resizing.
    document.addEventListener('pointercancel', onUp);
    // Suppresses selection + forces the col-resize cursor everywhere for the
    // duration, so the cursor doesn't flicker back to a caret whenever the
    // pointer outruns the handle.
    document.body.classList.add('xeplr-nav-resizing');
    return function() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.body.classList.remove('xeplr-nav-resizing');
    };
  }, [drawerResizing]);

  // Written once the gesture SETTLES, not on every pointermove — a drag fires
  // these by the hundred, and localStorage is synchronous.
  useEffect(function() {
    if (drawerResizing) return;
    try {
      window.localStorage.setItem(DRAWER_WIDTH_KEY, String(drawerWidth));
    } catch (err) {
      // Storage unavailable (see readStoredDrawerWidth) — the width still
      // works for this session, it just won't be remembered.
    }
  }, [drawerWidth, drawerResizing]);

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
    var overrides = labelMenuItems(props.settingsOverrides, access);
    // Same key → label treatment as the app's own items, so a Super Admin's
    // rename of "Profile" shows here too.
    var builtin = labelMenuItems(BUILTIN_SETTINGS_ITEMS.map(function(item) {
      return { key: item.menuName, name: item.menuName, path: authPath(item.authKey) };
    }), access);
    return overrides.concat(builtin);
  }, [allowedMenus, access, props.settingsOverrides]);

  var notificationsAllowed = allowedMenus.indexOf(NOTIFICATIONS_MENU_NAME) !== -1;

  // Role-filter the app's own drawer catalog down to what this user can see —
  // matched by KEY, shown by the LABEL the server holds, in the server's order.
  var drawerItems = useMemo(function() {
    return labelMenuItems(props.drawerItems, access);
  }, [props.drawerItems, access]);

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
    drawerItems: drawerItems,

    drawerWidth: drawerWidth,
    drawerResizing: drawerResizing,
    startDrawerResize: startDrawerResize,
    resetDrawerWidth: resetDrawerWidth,
    nudgeDrawerWidth: nudgeDrawerWidth,
    // Handed out so the View can fill in aria-valuemin/max and its own key
    // handling without re-declaring the numbers and drifting from them.
    drawerWidthBounds: DRAWER_WIDTH_BOUNDS
  };
}
