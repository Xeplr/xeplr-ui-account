# @xeplr/ui-account

**The React sign-in UI and app shell for [`@xeplr/auth`](https://www.npmjs.com/package/@xeplr/auth).** Every auth screen — login, register, forgot password, reset password, activate, profile, change password — the RBAC admin screens (user roles, access matrix, master settings), and `NavPage`: the top bar or side rail/drawer with the settings menu and notifications bell. `AccessProvider`, `useAccess`, `ProtectedRoute` and `AccessGuard` decide what a signed-in person may see, from the access answer `@xeplr/auth` sends.

Each screen is split in three: a **page** that wires a **controller** hook (all state and calls) to a **design** (the look), over **model** files with no React (the API client, token storage, scope, menu labels). Use the page, swap only its design, or use the hooks and model directly.

(The package name on npm is `@xeplr/ui-account` — the GitHub repo and folder are named `xeplr-ui-account`.)

## Install

```sh
npm i @xeplr/ui-account react-router-dom
```

Peer dependencies: `react ^18 || ^19` and `react-router-dom ^6 || ^7`. [`@xeplr/ui-utils`](https://www.npmjs.com/package/@xeplr/ui-utils) comes as a dependency (the controllers report success and failure with its `raiseSnackbar`).

The package ships its source: `.jsx` files and CSS imported from the designs. Your bundler must compile JSX from `node_modules` and import CSS (Vite does both).

## Setup (`main.jsx`)

```jsx
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import {
  configure, ThemeProvider, AccessProvider, ProtectedRoute, NavPage, authRoutes, authPath
} from '@xeplr/ui-account'

configure('http://localhost:19001')          // where @xeplr/auth's /auth/api/* is served; '' = same origin

function Shell() {
  return (
    <div className="app">                    {/* page background goes HERE, not on body */}
      <NavPage logo="/logo.svg" drawerItems={drawerItems} />
      <main className="app-main"><Outlet /></main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <ThemeProvider theme="dark">
    <AccessProvider>
      <BrowserRouter>
        <Routes>
          {authRoutes({}, { layout: <Shell /> })}
          <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>
            <Route path="/" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AccessProvider>
  </ThemeProvider>
)
```

```css
.app { min-height: 100vh; background: var(--xeplr-bg-primary); color: var(--xeplr-text-primary); }
.app-main { padding-left: 60px; }            /* room for the collapsed rail */
```

Link to auth pages with `authPath(key)` rather than a literal URL: `<Link to={authPath('profile')}>`.

### Rules

- **`<ThemeProvider>` is required.** `theme.css` defines every `--xeplr-*` variable only inside the `.xeplr-theme-dark`, `-light`, `-medium` and `-bright` classes — there is no `:root` fallback. Without a theme class above them, every screen renders unstyled and nothing reports an error. `ThemeProvider` renders that class on a wrapper `<div>` (you may instead put the class on a container yourself).
- **Set the page background on a container inside the theme wrapper, not on `body`.** `body` is outside the wrapper `<div>`, so `var(--xeplr-bg-primary)` there resolves to nothing.
- **Reserve room for the rail.** The drawer is `position: fixed` at the top-left, full height, `z-index: 500`, 60px wide when collapsed. It never pushes content, so the app must leave that space (e.g. `padding-left: 60px`). Expanded, it overlays the page. A full-screen modal must stack above 500 or the rail shows through it.
- **The rail only renders when the person may see at least one drawer item.** If none of `drawerItems` survives the access filter, `NavPage` renders the top bar instead (in normal flow, not fixed). If that can happen in your app, decide the padding with `labelMenuItems(drawerItems, access).length > 0`.

### Themes

| export | what it is |
|---|---|
| `ThemeProvider` | props `theme` (initial, default `'dark'`), `persist` (default `true`). With `persist`, the last choice saved in `localStorage` (`xeplr-theme`) wins over `theme`. |
| `useTheme()` | `{ theme, setTheme, themes, className }`, or `null` outside a provider |
| `useThemeStrict()` | the same, throws outside a provider |
| `BUILT_IN_THEMES`, `DEFAULT_THEME` | `['dark', 'light', 'medium', 'bright']`, `'dark'` |

A custom theme is a class with the same variables — `.xeplr-theme-corporate { --xeplr-bg-primary: …; … }` — used as `<ThemeProvider theme="corporate">`.

## Auth routes

`authRoutes(overrides, opts)` returns an array of `<Route>` — spread it inside `<Routes>`.

| key | path | group |
|---|---|---|
| `login` | `/auth/login` | public |
| `register` | `/auth/register` | public |
| `forgotPassword` | `/auth/forgot-password` | public |
| `resetPassword` | `/auth/reset-password` | public |
| `activate` | `/auth/activate` | public |
| `notActivated` | `/auth/not-activated` | public |
| `profile` | `/auth/profile` | account |
| `changePassword` | `/auth/change-password` | account |
| `userRoles` | `/auth/admin/user-roles` | admin |
| `accessMatrix` | `/auth/admin/access-matrix` | admin |
| `masterSettings` | `/auth/admin/master-settings` | admin |

Public pages are open and never wrapped in the layout. Account and admin pages require sign-in (`ProtectedRoute`); with `opts.layout` they are nested under that element, which must render an `<Outlet />`. The admin group only requires sign-in here — gate it further with an override.

```jsx
authRoutes({
  login: { design: MyLogin },                          // framework controller + validation, your look
  register: false,                                     // drop the route
  profile: <MyProfile />,                              // full replace (same as { element: <MyProfile /> })
  userRoles: { element: <ProtectedRoute roles={['Super Admin']}><UserRolesPage /></ProtectedRoute> },
  forgotPassword: { path: '/forgot', design: MyForgot } // mount at another path
}, { layout: <Shell />, loginPath: '/auth/login', raw: true })
```

| opt | default | meaning |
|---|---|---|
| `layout` | none | element wrapping the account and admin pages |
| `loginPath` | `/auth/login` | where `ProtectedRoute` sends a signed-out visitor |
| `raw` | `true` | also mount every page untouched at `/_<name>` (`/_login`, `/_admin/user-roles`) — the framework page, ignoring overrides and the layout |

`authPath(key)` returns the manifest path for a key, or `null`. It does not follow a `path` override.

## Access

```jsx
const { user, access, authenticated, hasMenu, refreshAccess } = useAccess()
```

`AccessProvider` seeds `user` and `access` from `localStorage` (written at login), then re-reads them from `GET /auth/api/me` on mount when a token exists — once per page load. Without this, access would stay whatever it was at login until the person logged out.

| field | what it is |
|---|---|
| `user`, `access`, `authenticated` | current state; `access` is `{ roles, pages, apis, menus, menuItems, elements }` as `@xeplr/auth` sends it |
| `hasPage(name)`, `hasApi(name)`, `hasMenu(name)`, `hasElement(name)`, `hasRole(name)` | `true` when the name is in that list |
| `refreshAccess()` | re-reads `/auth/api/me` and **replaces** `user` and `access` (not merged, so a revoked page is gone). Resolves to the new access, or `null` on failure — then it keeps the current state and shows an error snackbar. |
| `onLogin(result)` | stores a login response (`useLoginController` calls it) |
| `logout()` | clears tokens, access and active scope, tells the server (best effort) |
| `setAccess(access)` | replace access by hand |

**Call `refreshAccess()` after anything that changes access** — a role granted, a menu renamed — so the signed-in UI shows it. The admin screens in this package do not call it themselves.

`useAccess()` returns `null` outside a provider (safe in optional places); `useAccessStrict()` throws. `AccessProvider` also registers `logout` as the handler `authFetch` calls when the session is dead, so a failed refresh sends `ProtectedRoute` to login instead of leaving a stale `authenticated: true`.

### Guards

```jsx
<ProtectedRoute page="/reports" roles={['admin']} deniedPath="/"><Reports /></ProtectedRoute>

<AccessGuard element="btn-delete-user" fallback={null}>
  <button onClick={remove}>Delete</button>
</AccessGuard>
```

| component | props | behaviour |
|---|---|---|
| `ProtectedRoute` | `page`, `roles` (any one), `loginPath` (default `/auth/login`), `deniedPath` (default `/auth/login`) | signed out → saves the current location (`saveReturnTo`) and redirects to `loginPath`; missing page or roles → `deniedPath`; else renders children |
| `AccessGuard` | `element`, `menu`, `page`, `role`, `fallback` (default `null`) | renders children only when every given check passes |

These only shape the UI. The server's own middleware decides what an API returns.

## `authFetch`

```js
import { authFetch } from '@xeplr/ui-account'

const rows = await authFetch('/api/tasks')                                        // the parsed body
const saved = await authFetch('/api/tasks', { method: 'POST', body: JSON.stringify(task) })
```

**It returns the parsed JSON body, not a `Response`** — there is no `.json()` to call. It:

- prefixes the `configure()` base URL (a URL starting with `http` is used as is) and sends `Content-Type: application/json` unless you pass your own;
- attaches `Authorization: Bearer <token>`;
- attaches one header per registered multi-tenant level whose active scope has an `id` (see [Multi-tenancy](#multi-tenancy));
- stores the token from an `X-New-Token` response header — `@xeplr/auth`'s sliding refresh, so most expiries never become a 401;
- on a 401, rotates tokens once through `POST /auth/api/refresh` (concurrent calls share one refresh) and retries the request once. If refresh fails, it clears the stored auth and calls the session-expired handler.

On failure it **throws an `Error`**:

| field | when | what |
|---|---|---|
| `message` | always | the server's `error` string, else `error.message`, else `message`, else `Something went wrong` |
| `status` | always | HTTP status |
| `body` | non-2xx | the parsed error body |
| `code`, `busy` | when the body has them | copied from the body |
| `request` | always | `"POST http://…/api/tasks"` |
| `rawBody`, `contentType`, `bodyLength`, `parseError` | the reply was not JSON | the first 600 characters and what was wrong |

Every reply must be JSON: an empty body (a `204`, say) throws too. Each failure is also logged with `console.error`, naming the request.

`configure(baseUrl, { onSessionExpired })` sets the base URL and optionally a handler; `setSessionExpiredHandler(fn)` sets the handler on its own (`AccessProvider` does this for you).

## Menu keys and labels

`NavPage`'s `drawerItems` and `settingsOverrides` are matched by **`key`** (the legacy `name` is still accepted) against `access.menus`. The text shown is the **label from `access.menuItems`** — set by the Super Admin and stored in `@xeplr/auth`'s `menus.label` — and items appear **in the server's order**, not the array's.

**Never write labels in code.** The key is what code and roles match on and never changes; the label is what people read and is renamed from the app without a code change or a restart. (An item's own `label`, or its key, is shown only when the server sends no label.)

```jsx
const navigate = useNavigate()
const drawerItems = [
  { key: 'Tasks',   icon: <TaskIcon />,   clickHandler: () => navigate('/tasks') },
  { key: 'Reports', icon: <ReportIcon />, clickHandler: () => navigate('/reports'), group: 'Insights', badge: 3 },
]
const settingsOverrides = [{ key: 'Admin', path: '/admin' }]
```

- **An unknown key is dropped silently.** A key that is not in `access.menus` — not seeded, not granted to this role, hidden, or misspelled — simply does not render, with no warning. Seed the menu row in `@xeplr/auth` and grant it before looking anywhere else.
- **Give every drawer item an `icon`.** The collapsed rail shows icons only; an item without one is an empty button there.
- `group` is a section header, written in code and shown as is. Ungrouped items come first.
- `badge` (number or short string) shows as a pill when expanded and a dot on the icon when collapsed; `0`, `''` and `null` show nothing.

`labelMenuItems(catalog, access)` is the pure function behind this — it returns the items the person may see, each with `key` and `label`, in the server's order.

### Changing the menu

| call | server | |
|---|---|---|
| `listMenuItems()` | `GET /auth/api/admin/menu-items` | every item, hidden ones included: `[{ name, label, shown, sortOrder, isHidden, isPublic }]` |
| `saveMenuItems(items)` | `POST /auth/api/admin/menu-items` | rename / reorder / hide by key: `[{ name, label?, sortOrder?, isHidden? }]` |
| `addMenuItem({ name, label })` | `POST /auth/api/admin/menu-items/add` | a new item; `name` is its key |
| `removeMenuItem(name)` | `POST /auth/api/admin/menu-items/remove` | |

All four are **Super Admin only** on the server (anyone else gets 403). Access answers are cached server-side; saving through these calls clears that cache, so call `refreshAccess()` straight after to show the change.

## NavPage

```jsx
<NavPage
  logo="/icon.svg" expandedLogo="/lockup.svg"
  drawerItems={drawerItems}
  settingsOverrides={settingsOverrides}
  notifications={{ count: unread, onClick: openFeed }}
/>
```

Exactly one of two things renders: with at least one visible drawer item, the **drawer rail** is the whole nav (settings and bell in its footer); otherwise the **top bar**. `NavPage` is memoized and owns its own open/closed state, so it does not re-render when the routed page changes — keep it in the layout next to `<Outlet />`.

| prop | applies to | meaning |
|---|---|---|
| `drawerItems` | drawer | `[{ key, icon, clickHandler, group?, badge? }]` — a non-empty visible list turns the drawer on |
| `settingsOverrides` | both | `[{ key, path }]`, shown above the built-in items in the settings menu |
| `notifications` | both | `{ count, onClick }` — the bell shows only when this is given **and** `access.menus` contains `Notifications`; a count above 9 shows `9+` |
| `logo` | both | image URL: the top bar's logo, the collapsed rail's toggle |
| `expandedLogo` | drawer | image URL shown when expanded |
| `drawerPromo` | drawer | node shown under the links when expanded |
| `floatingSettings` | drawer | `true` moves the bell and settings out of the rail footer to the page's top-right corner |
| `navMiddle` | top bar | node for the middle column (e.g. a company picker) |
| `design` | top bar | your own top bar component (default `NavTopSample`) |

The settings menu lists `settingsOverrides`, then **Profile** and **Change Password** when those keys are in `access.menus` (shown by their label, like every other item, and linking to `authPath('profile')` / `authPath('changePassword')`), then Logout.

The drawer toggles by clicking its logo, has a search box when expanded, and its expanded width is resizable by dragging or with the keyboard (arrows, Home/End, Enter or double-click to reset): 180–480px, default 240, remembered per browser in `localStorage` (`xeplr-nav-drawer-width`).

## Multi-tenancy

```js
import { registerMTs, setActiveScope } from '@xeplr/ui-account'

registerMTs({
  l1: { name: 'companyId',   header: 'x-company-id' },
  l2: { name: 'workspaceId', header: 'x-workspace-id' }
})

setActiveScope('l1', { id: 'acme-co', name: 'Acme Co' })   // every authFetch now sends x-company-id: acme-co
```

Call `registerMTs(slots)` once at boot with **the same shape** passed to `@xeplr/db`'s `registerMTs` on the API. Nothing shares it at runtime, so keep one literal config in your app and import it into both entry points so they cannot drift. Levels `l1`–`l4` are read; headers are lowercased. It only tells `authFetch` which header to send — it validates nothing.

| export | what it does |
|---|---|
| `getActiveScope(level)` / `setActiveScope(level, scope)` | the active value per level, in `localStorage` (`xeplr:activeScope:<level>`); `authFetch` sends its `id`. `null` removes it. |
| `clearActiveScope(level?)` | one level, or every level when omitted (`logout` does this) |
| `getLastScope(level)` / `setLastScope(level, scope)` | the last value per level (`xeplr:lastScope:<level>`), **not** cleared by `clearActiveScope` or logout — so an app can offer to resume after signing in. Re-check eligibility before trusting it. |
| `getMtConfig()` | a copy of the registered slots |

### Returning after a gate

`saveReturnTo(location)` records `pathname + search`; `consumeReturnTo()` reads and clears it. `ProtectedRoute` saves before redirecting to login, and the login page's default `onSuccess` navigates to `consumeReturnTo() || '/'`. An app's own gate (a company picker, say) does the same: save before redirecting, consume where the person lands. It is kept in `sessionStorage` — per tab — because it is for "send me back to what I was doing", not a link revived days later.

## Three ways to use it

1. **Ready-made** — `authRoutes()`, or the pages directly: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `ActivatePage`, `NotActivatedPage`, `ChangePasswordPage`, `ProfilePage`, `UserRolesPage`, `AccessMatrixPage`, `MasterSettingsPage`, `NavPage`. Other props (`onSuccess`, …) go to the controller.
2. **Your own design** — `<LoginPage design={MyLogin} />` or `authRoutes({ login: { design: MyLogin } })`. Your component receives the controller's return value as props, and the page still checks it for the required elements (below).
3. **Hooks and model** — call a `use*Controller` hook in your own component, or use the React-free files (`api.js`, `adminApi.js`, `masterApi.js`, `token.js`, `mt.js`, `activeScope.js`, `returnTo.js`, `menuLabels.js`) alone.

### Controllers

| hook | options | returns |
|---|---|---|
| `useLoginController` | `onSuccess(result)`, `notActivatedPath` | `email, setEmail, password, setPassword, error, loading, handleSubmit` |
| `useRegisterController` | `onSuccess` | `form, error, success, loading, handleChange, handleSubmit` |
| `useForgotPasswordController` | — | `email, setEmail, error, success, loading, handleSubmit` |
| `useResetPasswordController` | — | `token, password, setPassword, error, success, loading, handleSubmit` |
| `useActivateController` | — | `token, error, success, loading` |
| `useChangePasswordController` | `onSuccess` | `currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, error, success, loading, handleSubmit` |
| `useProfileController` | `onSuccess` | `form, error, success, loading, fetching, handleChange, handleSubmit` |
| `useUserRolesController` | — | `users, roles, search, setSearch, loading, error, saving, handleToggle, isAssigned, reload` |
| `useAccessMatrixController` | — | `roles, modules, uncategorized, uncategorizedCount, uncatSubTab, setUncatSubTab, activeView, setActiveView, search, setSearch, loading, error, handleModuleToggle, handleItemToggle, isItemAssigned, isModuleSaving, isItemSaving, reload` |
| `useMasterSettingsController` | — | `tabs, activeTab, setActiveTab, currentTab, items, groupNames, search, setSearch, loading, error, saving, editingItem, editForm, startAdd, startEdit, cancelEdit, updateField, handleSave, handleDelete, reload` |
| `useNavController` | `drawerItems, settingsOverrides, notifications` | `user, accountItems, notifications, logout, accountOpen, toggleAccount, closeAccount, accountRef, drawerOpen, toggleDrawer, closeDrawer, drawerItems, drawerWidth, drawerResizing, startDrawerResize, resetDrawerWidth, nudgeDrawerWidth, drawerWidthBounds` |

- Login stores the tokens and calls `AccessProvider`'s `onLogin` when a provider is present. A login refused with "Please wait, someone will activate you." navigates to `notActivatedPath` (default `/auth/not-activated`). Supplying `onSuccess` replaces the default navigation entirely.
- Register, profile: `handleChange` reads `e.target.name`, so inputs need `name="email"` etc. `form` is `{ name, email, phoneNumber, password }` / `{ name, email, phoneNumber }`.
- Reset and activate read `?token=` (activate also passes `?workflowKey=` back to the server) and activate runs on mount.
- The access matrix groups items whose group is `module:action` (e.g. `account:view`) under Modules; the rest are Uncategorized. The Super Admin role is left out of its columns.
- `MASTER_TYPES` is `['roles', 'apis', 'pages', 'elements', 'menus']`.

### Design validation

Each page (except activate and not-activated) checks its rendered design three seconds after mounting and, outside production, `console.warn`s what is missing. `useDesignValidator(name, rules)` does the check for your own components.

| rules | required |
|---|---|
| `LOGIN_RULES` | `#xeplr-email`, `#xeplr-password`, `button[type="submit"]` |
| `REGISTER_RULES` | `#xeplr-name`, `#xeplr-email`, `#xeplr-password`, submit |
| `FORGOT_PASSWORD_RULES` | `#xeplr-email`, submit |
| `RESET_PASSWORD_RULES` | `#xeplr-password`, submit |
| `CHANGE_PASSWORD_RULES` | `#xeplr-current-password`, `#xeplr-new-password`, `#xeplr-confirm-password`, submit |
| `PROFILE_RULES` | `#xeplr-profile-name`, `#xeplr-profile-email`, submit |
| `USER_ROLES_MATRIX_RULES` | `#xeplr-admin-user-search`, `[role="grid"]` |
| `ACCESS_MATRIX_RULES` | `#xeplr-admin-access-search`, `[role="tablist"]` |
| `MASTER_SETTINGS_RULES` | `#xeplr-admin-master-search`, `[role="tablist"]` |
| `NAV_RULES` | `[aria-haspopup="menu"]` |

### Designs

`LoginSample`, `RegisterSample`, `ForgotPasswordSample`, `ResetPasswordSample`, `ActivateSample`, `NotActivatedSample`, `ChangePasswordSample`, `ProfileSample`, `UserRolesMatrixSample`, `AccessMatrixSample`, `MasterSettingsSample`, `NavTopSample`, `NavDrawer`, `NavFloatingSettings`, `AccountMenu`, `NotificationsBell` — the defaults, exported as a reference or starting point. Styles are namespaced `.xeplr-auth-*`, `.xeplr-admin-*` and `.xeplr-nav-*`.

## API

Unauthenticated calls go straight to `fetch`; the rest use `authFetch`. All resolve to the parsed body and throw the same `Error` shape.

| function | request |
|---|---|
| `registerUser({ email, password, name, phoneNumber })` | `POST /auth/api/register` |
| `loginUser({ email, password })` | `POST /auth/api/login` → `{ accessToken, refreshToken, user, access }` (does not store them — the login controller does) |
| `activateAccount(token, workflowKey?)` | `GET /auth/api/activate?token=…` |
| `forgotPassword({ email })` | `POST /auth/api/forgot-password` |
| `resetPassword({ token, newPassword })` | `POST /auth/api/reset-password` |
| `changePassword({ currentPassword, newPassword })` | `POST /auth/api/change-password` (auth) |
| `getMe()` | `GET /auth/api/me` → `{ user, access }` (auth) |
| `getProfile()` / `updateProfile(fields)` | `GET` / `PUT /auth/api/profile` (auth) |
| `uploadAvatar(file)` | `POST /auth/api/profile/avatar`, multipart. Sends the token only — no scope headers, no refresh retry. |
| `logoutUser()` | clears stored auth and active scope, then `POST /auth/api/logout` without waiting |

Admin (auth):

| function | request |
|---|---|
| `getUsers()`, `getRoles()`, `getAccessItems()` | `GET /auth/api/admin/users`, `/roles`, `/access-items` |
| `toggleUserRole({ userId, roleId, assign })` | `POST /auth/api/admin/user-role` |
| `toggleAccessRole({ type, itemId, roleId, assign })` | `POST /auth/api/admin/access-role` |
| `toggleModuleRole({ module, action, roleId, assign })` | `POST /auth/api/admin/module-role` |
| `getMasterItems(type)`, `saveMasterItem(type, data)`, `deleteMasterItem(type, id)` | `GET` / `POST /auth/api/admin/master/<type>`, `POST …/<type>/delete` |
| `listMenuItems`, `saveMenuItems`, `addMenuItem`, `removeMenuItem` | see [Changing the menu](#changing-the-menu) |

Token storage (`localStorage` keys `accessToken`, `refreshToken`, `user`; `AccessProvider` adds `access`): `getToken`, `setToken`, `getRefreshToken`, `setRefreshToken`, `getUser`, `setUser`, `clearAuth`, `isAuthenticated`.

## Files

```
src/
  index.js                 ─ every export
  api.js                   ─ configure, authFetch, the auth calls
  adminApi.js, masterApi.js ─ RBAC and master-data calls, menu items
  token.js                 ─ token and user storage
  mt.js, activeScope.js    ─ multi-tenant levels and the scope per level
  returnTo.js              ─ where to go after a gate
  menuLabels.js            ─ labelMenuItems
  AccessContext.jsx        ─ AccessProvider, useAccess, useAccessStrict
  ProtectedRoute.jsx, AccessGuard.jsx
  ThemeContext.jsx         ─ ThemeProvider, useTheme
  use*Controller.js        ─ one controller per screen, and useNavController
  validateDesign.js        ─ useDesignValidator and the *_RULES
  pages.jsx                ─ controller + design, per screen; NavPage
  authRoutes.jsx           ─ authRoutes, authPath
  designs/                 ─ the *Sample designs, nav parts, theme.css, auth.css, admin.css, nav.css
```

## Tests

```sh
npm test        # node --test test/*.test.js
```

## License

MIT
