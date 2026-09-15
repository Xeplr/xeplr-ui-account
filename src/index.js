// API client
export { configure, setSessionExpiredHandler, registerUser, loginUser, activateAccount, forgotPassword, resetPassword, changePassword, getMe, getProfile, updateProfile, uploadAvatar, logoutUser, authFetch } from './api.js';

// Token helpers
export { getToken, setToken, getRefreshToken, setRefreshToken, getUser, setUser, clearAuth, isAuthenticated } from './token.js';

// Multi-tenant levels — call registerMTs() once at app boot with the SAME
// shape passed to @xeplr/db's registerMTs() on the backend. Teaches authFetch
// which header to attach for each level, read from activeScope. See mt.js.
export { registerMTs, getMtConfig } from './mt.js';

// Active scope (e.g. company/workspace), keyed by MT level (l1, l2, ...) — a
// bare, app-interpreted value per level, attached to every authFetch call as
// that level's configured header. See activeScope.js.
export { getActiveScope, setActiveScope, clearActiveScope, getLastScope, setLastScope } from './activeScope.js';

// Where to send the user once a redirect-driven gate (auth, or an app's own
// gate) resolves — e.g. back to the exact dashboard a deep link pointed at,
// rather than always home. See returnTo.js.
export { saveReturnTo, consumeReturnTo } from './returnTo.js';

// Controller hooks
export { useLoginController } from './useLoginController.js';
export { useRegisterController } from './useRegisterController.js';
export { useForgotPasswordController } from './useForgotPasswordController.js';
export { useResetPasswordController } from './useResetPasswordController.js';
export { useActivateController } from './useActivateController.js';
export { useChangePasswordController } from './useChangePasswordController.js';
export { useProfileController } from './useProfileController.js';
export { useUserRolesController } from './useUserRolesController.js';
export { useAccessMatrixController } from './useAccessMatrixController.js';
export { useMasterSettingsController } from './useMasterSettingsController.js';
export { useNavController } from './useNavController.js';

// Theme
export { ThemeProvider, useTheme, useThemeStrict, BUILT_IN_THEMES, DEFAULT_THEME } from './ThemeContext.jsx';

// Access control
export { AccessProvider, useAccess, useAccessStrict } from './AccessContext.jsx';
export { ProtectedRoute } from './ProtectedRoute.jsx';
export { AccessGuard } from './AccessGuard.jsx';

// Admin API (model layer for RBAC management)
export { getUsers, getRoles, getAccessItems, toggleUserRole, toggleAccessRole, toggleModuleRole, listMenuItems, saveMenuItems, addMenuItem, removeMenuItem } from './adminApi.js';
export { labelMenuItems } from './menuLabels.js';
export { getMasterItems, saveMasterItem, deleteMasterItem, MASTER_TYPES } from './masterApi.js';

// Design validation (use when building custom designs)
export { useDesignValidator, LOGIN_RULES, REGISTER_RULES, FORGOT_PASSWORD_RULES, RESET_PASSWORD_RULES, CHANGE_PASSWORD_RULES, PROFILE_RULES, USER_ROLES_MATRIX_RULES, ACCESS_MATRIX_RULES, MASTER_SETTINGS_RULES, NAV_RULES } from './validateDesign.js';

// Sample designs (use as reference or starting point)
export { LoginSample, RegisterSample, ForgotPasswordSample, ResetPasswordSample, ActivateSample, NotActivatedSample, ChangePasswordSample, ProfileSample, UserRolesMatrixSample, AccessMatrixSample, MasterSettingsSample, NavTopSample, AccountMenu, NavDrawer, NavFloatingSettings, NotificationsBell } from './designs/index.js';

// Ready-made pages (controller + sample design wired together; each takes an optional `design` prop)
export { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, ActivatePage, NotActivatedPage, ChangePasswordPage, ProfilePage, UserRolesPage, AccessMatrixPage, MasterSettingsPage, NavPage } from './pages.jsx';

// One-call auth routing — mount every auth page with no boilerplate; override just what you want
export { authRoutes, authPath } from './authRoutes.jsx';
