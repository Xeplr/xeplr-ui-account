# @xeplr/ui-account — map

Browser (and React Native) side of `@xeplr/auth`: the signed fetch every xeplr UI uses (`authFetch`), sign-in
steps, access state + guards, company/workspace scope, account and RBAC admin pages, nav, push. Used by BI,
X-Flow, Taskie and every `@xeplr/cli` app. Not a server and holds no access rules itself — `/auth/api/me` decides.
API/props: see README → API, Auth routes, NavPage.

## Where things are
Models (no React): `src/*.js` · controllers `src/use*Controller.js` · designs `src/designs/*.jsx` + `*.css` (re-exported
by `designs/index.js`) · rules `src/validateDesign.js` (`*_RULES`) · pages `src/pages.jsx` (each takes `design` to re-skin).
- `src/api.js` — `configure(baseUrl)`, `setSessionExpiredHandler()`, `authFetch()`, `authFetchFile()`, `authEventStream()` +
  `parseEventStream()`, `renewSession()` (= private `refreshAccessToken()`, deduped via `_refreshPromise`), private
  `signedFetch()` (token, MT headers, `X-New-Token`, 401 → refresh → retry once, 403 `NOT_A_MEMBER` → drop scope),
  unauthenticated `request()` and every `/auth/api/*` call (`loginUser`, `verifySecondStep`, `getMe`, `uploadAvatar`, …).
- `src/token.js` — localStorage keys `accessToken`, `refreshToken`, `user`, `xeplrTrustToken`; `clearAuth()`.
- `src/mt.js` — `registerMTs()` (same shape as `@xeplr/db`), `getMtConfig()`: which header per level l1–l4.
- `src/activeScope.js` — `get/setActiveScope(level)`, `clearActiveScope()`, `get/setLastScope()`, `activeTenants()`,
  `activeScopeOwner()`, `SCOPE_CHANGED_EVENT` (window event). Keys `xeplr:activeScope:<level>`, owner-stamped.
- `src/scopeChoice.js` (`createScopeChoice`, `scopeChosen`; default lists `/api/tenants/<key>`) + `src/useScopeChoice.js`.
- `src/AccessContext.jsx` — `AccessProvider` (access/user/authenticated, `onLogin`, `logout`, `refreshAccess`,
  `hasPage/hasApi/hasMenu/hasElement/hasRole`), `useAccess()`, `useAccessStrict()`.
- `src/ProtectedRoute.jsx` (`page`/`roles` → `Navigate`, saves return path), `src/AccessGuard.jsx`, `src/returnTo.js`.
- `src/authRoutes.jsx` — `MANIFEST` (key → path → Page → public/account/admin), `authRoutes(overrides)`, `authPath(key)`;
  admin paths come from `src/adminPaths.js` → `ADMIN_PAGES`.
- `src/adminApi.js` (users/roles/access toggles/menu items), `src/masterApi.js` (`MASTER_TYPES`, `/auth/api/admin/master/*`),
  `src/accessStates.js` (enabled/disabled/hidden cell logic, internal), `src/adminUrlState.js` (admin screens' URL keys, internal),
  `src/menuLabels.js` → `labelMenuItems(catalog, access)`, `src/qrCode.js` (`qrMatrix`), `src/push.js` (`enablePush`, `pushStatus`, …).
- `src/ThemeContext.jsx` — `ThemeProvider`, `useTheme`, `BUILT_IN_THEMES`; tokens in `designs/theme.css` (`--xeplr-*`).
- Feature → controller → design → rules → page:
  - Sign-in: `useLoginController` (steps first/code/second) → `LoginDesigns.jsx` (`LoginDesign1–5`), `LoginSample`/`LoginForm` → `LOGIN_RULES` → `LoginPage` (`design` = component or 1–5)
  - Register / Forgot / Reset / Activate / Resend / Accept invite: `use<Name>Controller` → `<Name>Sample.jsx` → `<NAME>_RULES` → `<Name>Page`; `NotActivatedPage` has no controller
  - Account: `useChangePasswordController`, `useProfileController`, `useSignInSecurityController` (2FA, QR) → `ChangePasswordSample`, `ProfileSample`, `SignInSecuritySample` → `ProfilePage` also embeds security
  - Admin: `useUserRolesController` → `UserRolesMatrixSample`; `useAccessMatrixController` (biggest) → `AccessMatrixSample`; `useMasterSettingsController` → `MasterSettingsSample`; tabs in `AdminTabs.jsx`
  - Nav: `useNavController` (drawer items via `labelMenuItems`, drawer width, notifications) → `NavTopSample` | `NavDrawer` (+ `NavFloatingSettings`, `AccountMenu`, `NotificationsBell`, `PushToggle`) → `NAV_RULES` → `NavPage` (memo)
  - Push: `usePushController` → `PushToggle`; worker `sw/xeplr-push-sw.js`, served at root by `vite.js` → `xeplrPushWorker()`.
- `src/native/` (`@xeplr/ui-account/native` via `native/index.js`): `storage.js` (`hydrateStorage` puts AsyncStorage behind
  `globalThis.localStorage`), `session.js` (`startSession`, `useSession`, `signIn`, `finishSecondStep`, `signOut`, `refreshAccess`),
  `NativeSignIn.jsx`, `NativeScopePicker.jsx` (use `@xeplr/ui-factory/native` parts).
- `dev/` — Vite playground (`npm run dev`), also what `test/phone.check.js` drives.

## Flow
App boot: `configure(base)` + `registerMTs()` → `<AccessProvider>` seeds from localStorage → `getMe()` (`/auth/api/me`,
with `x-verify-tenant` from `activeTenants()`) → `setAccess()` → nav/guards re-render.
Any call: `authFetch()` → `signedFetch()` → headers (Bearer + one per MT slot) → `fetch` → `absorbNewToken()` → 401:
`refreshAccessToken()` (POST `/auth/api/refresh`) → retry; refresh refused → `clearAuth()` + `_onSessionExpired` (= `logout`).
Scope change: `setActiveScope()` → `SCOPE_CHANGED_EVENT` → `AccessProvider` re-asks `getMe()` (latest answer wins).

## To change X, edit Y
- Header/token/retry behaviour of every request → `src/api.js` → `signedFetch()`; refresh → `refreshAccessToken()`.
- A new auth endpoint call → `src/api.js` (export it in `src/index.js`, and `src/native/index.js` if phones need it).
- Session-expired handling → `AccessContext.jsx` (`setSessionExpiredHandler(logout)` effect); phone → `native/session.js` → `startSession()`.
- A new auth page/path → `authRoutes.jsx` → `MANIFEST` (+ `pages.jsx`, controller, design, `validateDesign.js` rules).
- Required ids in a design (e.g. `xeplr-email`, `xeplr-password`) → `validateDesign.js` → `*_RULES`; sample must render them.
- Sign-in steps / OTP / 2FA → `useLoginController.js`; settings page → `useSignInSecurityController.js`.
- Drawer item filtering, labels, order → `menuLabels.js` → `labelMenuItems()`; built-in settings items → `useNavController.js` → `BUILTIN_SETTINGS_ITEMS`.
- Access matrix states → `accessStates.js` + `useAccessMatrixController.js`.
- Company/workspace picker logic → `scopeChoice.js`; storage/owner rules → `activeScope.js`.
- Theme colours → `designs/theme.css` + `ThemeContext.jsx`.

## Rules and traps
- Drawer items whose key is not in `access.menus` are dropped silently — menu names must match the auth `menus` rows exactly.
- Access is REPLACED on every `getMe()`, never merged; on a network error it is kept and a snackbar shown.
- A network failure during refresh throws, it does not sign out; only a refused/missing refresh token does.
- `NOT_A_MEMBER` 403: scope cleared, GET retried without it; writes are not retried.
- MT headers are lowercased in `registerMTs()`; frontend config must match the backend's `registerMTs` literally.
- `useDesignValidator` here only `console.warn`s, after 3 s, and not in production — it does not block (unlike ui-utils' `useDesignCheck`).
- `@xeplr/ui-utils` is a dependency (`raiseSnackbar`, `src/url/useUrlState.js` for admin screens); keep the `^` range compatible.
- `@xeplr/ui-factory` and `react-native` are optional peers — only `native/` imports them; never import native code from `src/index.js`.
- Push worker must be served at the site root (`PUSH_WORKER_PATH`), not under `/assets/`.

## Test
- `npm test` = `node --test test/*.test.js`. No env needed: HTTP tests start local `node:http` servers standing in for
  `@xeplr/auth` (`renewSession`, `authFetchBody`, `authFetchFile`, `authEventStream`, `signInSteps`, `signupApi`,
  `scopedAccess`, `staleScope`, `scopeChoice`, `nativeSessionFlow`); pure: `accessStates`, `adminUrlState`, `menuLabels`,
  `push`, `pushFlow` (stand-in browser), `nativeSession`.
- `npm run test:phone` = `node test/phone.check.js`: real Chromium via Playwright on the `dev/` app (run
  `npx playwright install chromium-headless-shell` once). Not part of `npm test`.
