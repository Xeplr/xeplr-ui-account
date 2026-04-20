// API client
export { configure, registerUser, loginUser, activateAccount, forgotPassword, resetPassword, changePassword, getProfile, updateProfile, logoutUser, getMyTenants, authFetch } from './api.js';

// Token helpers
export { getToken, setToken, getRefreshToken, setRefreshToken, getUser, setUser, clearAuth, isAuthenticated } from './token.js';

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
export { useTenantController } from './useTenantController.js';
export { useTenantPickerController, getActiveTenant, setActiveTenant, clearActiveTenant, hasMultipleTenants } from './useTenantPickerController.js';

// Theme
export { ThemeProvider, useTheme, useThemeStrict, BUILT_IN_THEMES, DEFAULT_THEME } from './ThemeContext.jsx';

// Access control
export { AccessProvider, useAccess, useAccessStrict } from './AccessContext.jsx';
export { ProtectedRoute } from './ProtectedRoute.jsx';
export { AccessGuard } from './AccessGuard.jsx';

// Admin API (model layer for RBAC management)
export { getUsers, getRoles, getAccessItems, toggleUserRole, toggleAccessRole, toggleModuleRole } from './adminApi.js';
export { getMasterItems, saveMasterItem, deleteMasterItem, MASTER_TYPES } from './masterApi.js';
export { getTenants, saveTenant, deleteTenant, assignUserTenant } from './adminApi.js';

// Design validation (use when building custom designs)
export { useDesignValidator, LOGIN_RULES, REGISTER_RULES, FORGOT_PASSWORD_RULES, RESET_PASSWORD_RULES, CHANGE_PASSWORD_RULES, PROFILE_RULES, USER_ROLES_MATRIX_RULES, ACCESS_MATRIX_RULES, MASTER_SETTINGS_RULES } from './validateDesign.js';

// Sample designs (use as reference or starting point)
export { LoginSample, RegisterSample, ForgotPasswordSample, ResetPasswordSample, ActivateSample, NotActivatedSample, ChangePasswordSample, ProfileSample, UserRolesMatrixSample, AccessMatrixSample, MasterSettingsSample, TenantSample } from './designs/index.js';

// Ready-made pages (controller + sample design wired together)
export { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, ActivatePage, NotActivatedPage, ChangePasswordPage, ProfilePage, UserRolesPage, AccessMatrixPage, MasterSettingsPage, TenantPage, TenantPickerPage } from './pages.jsx';
