import { isValidElement } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import {
  LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, ActivatePage,
  NotActivatedPage, ProfilePage, ChangePasswordPage,
  UserRolesPage, AccessMatrixPage, MasterSettingsPage
} from './pages.jsx';

/**
 * The auth-UI route table — the single source of truth for auth page paths.
 *
 *   group 'public'  → open (login, register, activate, …)
 *   group 'account' → login required (profile, change-password, …)
 *   group 'admin'   → login required (RBAC/master screens; add page/roles to gate further)
 */
var MANIFEST = [
  { key: 'login',          path: '/auth/login',                 Page: LoginPage,          group: 'public' },
  { key: 'register',       path: '/auth/register',              Page: RegisterPage,       group: 'public' },
  { key: 'forgotPassword', path: '/auth/forgot-password',       Page: ForgotPasswordPage, group: 'public' },
  { key: 'resetPassword',  path: '/auth/reset-password',        Page: ResetPasswordPage,  group: 'public' },
  { key: 'activate',       path: '/auth/activate',              Page: ActivatePage,       group: 'public' },
  { key: 'notActivated',   path: '/auth/not-activated',         Page: NotActivatedPage,   group: 'public' },
  { key: 'profile',        path: '/auth/profile',               Page: ProfilePage,        group: 'account' },
  { key: 'changePassword', path: '/auth/change-password',       Page: ChangePasswordPage, group: 'account' },
  { key: 'userRoles',      path: '/auth/admin/user-roles',      Page: UserRolesPage,      group: 'admin' },
  { key: 'accessMatrix',   path: '/auth/admin/access-matrix',   Page: AccessMatrixPage,   group: 'admin' },
  { key: 'masterSettings', path: '/auth/admin/master-settings', Page: MasterSettingsPage, group: 'admin' }
];

var _pathByKey = {};
MANIFEST.forEach(function (e) { _pathByKey[e.key] = e.path; });

/**
 * Resolve a manifest key to its canonical path — use it for cross-links so nothing
 * hardcodes a URL:  <Link to={authPath('register')}>Register</Link>
 */
export function authPath(key) {
  return _pathByKey[key] || null;
}

// /auth/login → /_login, /auth/admin/user-roles → /_admin/user-roles.
// A stable "always the pristine framework page" escape hatch that ignores overrides.
function rawPathOf(path) {
  return path.replace(/^\/auth\//, '/_');
}

// Turn an override entry into the element to render at the canonical path.
function resolveElement(entry, ov) {
  var Page = entry.Page;
  if (!ov) return <Page />;                          // framework default
  if (isValidElement(ov)) return ov;                 // bare element  → full replace
  if (ov.element) return ov.element;                 // { element }   → full replace
  if (ov.design) return <Page design={ov.design} />; // { design }    → re-skin (keeps controller)
  return <Page />;                                   // e.g. only { path } supplied
}

/**
 * Emit every auth UI route in one call — the app writes no route boilerplate.
 *
 *   <Routes>
 *     {authRoutes()}                                 // all framework defaults
 *     {authRoutes({ login: { design: MyLogin } })}   // custom login, everything else default
 *     {authRoutes({}, { layout: <Nav/> })}           // account/admin pages inside your shell
 *   </Routes>
 *
 * @param {object} [overrides]  map of manifest key → how to render it:
 *   - { design: MyDesign }   re-skin: framework controller + validation, your look
 *                            (design receives the controller's props)
 *   - { element: <X/> }      full replace: your element, framework logic ignored
 *   - a React element        shorthand for { element }
 *   - false | null           drop this route (app doesn't want it)
 *   - { path: '/x', ... }    remount at a different path (combine with design/element)
 * @param {object} [opts]
 *   - layout: element        wrap account+admin pages in a parent layout route
 *                            (your <Nav/> with an <Outlet/>); public pages stay bare
 *   - raw: false             disable the /_<name> escape-hatch routes (on by default)
 *   - loginPath: string      ProtectedRoute redirect target (default: manifest login path)
 * @returns {Array} an array of <Route> — spread it inside <Routes>
 */
export function authRoutes(overrides, opts) {
  overrides = overrides || {};
  opts = opts || {};
  var loginPath = opts.loginPath || _pathByKey.login;
  var routes = [];
  var layoutChildren = [];   // account+admin canonical routes, nested under opts.layout

  function protect(el) {
    return <ProtectedRoute loginPath={loginPath}>{el}</ProtectedRoute>;
  }

  MANIFEST.forEach(function (entry) {
    var ov = overrides[entry.key];
    if (ov === false || ov === null) return;   // opted out

    var path = (ov && ov.path) || entry.path;
    var el = resolveElement(entry, ov);

    // Canonical route (override-aware).
    if (entry.group === 'public') {
      routes.push(<Route key={entry.key} path={path} element={el} />);
    } else if (opts.layout) {
      layoutChildren.push(<Route key={entry.key} path={path} element={el} />);
    } else {
      routes.push(<Route key={entry.key} path={path} element={protect(el)} />);
    }

    // Escape-hatch route: always the pristine framework page, ignores overrides.
    if (opts.raw !== false) {
      var Page = entry.Page;
      var rawEl = entry.group === 'public' ? <Page /> : protect(<Page />);
      routes.push(<Route key={'_' + entry.key} path={rawPathOf(entry.path)} element={rawEl} />);
    }
  });

  if (opts.layout && layoutChildren.length) {
    routes.push(
      <Route key="__auth_layout" element={protect(opts.layout)}>
        {layoutChildren}
      </Route>
    );
  }

  return routes;
}
