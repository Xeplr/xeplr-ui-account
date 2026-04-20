import { useLoginController } from './useLoginController.js';
import { useRegisterController } from './useRegisterController.js';
import { useForgotPasswordController } from './useForgotPasswordController.js';
import { useResetPasswordController } from './useResetPasswordController.js';
import { useActivateController } from './useActivateController.js';
import { useChangePasswordController } from './useChangePasswordController.js';
import { useProfileController } from './useProfileController.js';
import { useUserRolesController } from './useUserRolesController.js';
import { useAccessMatrixController } from './useAccessMatrixController.js';
import { useMasterSettingsController } from './useMasterSettingsController.js';
import { useTenantController } from './useTenantController.js';
import { useTenantPickerController } from './useTenantPickerController.js';
import { LoginSample, RegisterSample, ForgotPasswordSample, ResetPasswordSample, ActivateSample, NotActivatedSample, ChangePasswordSample, ProfileSample, UserRolesMatrixSample, AccessMatrixSample, MasterSettingsSample, TenantSample, TenantPickerSample } from './designs/index.js';
import { useDesignValidator, LOGIN_RULES, REGISTER_RULES, FORGOT_PASSWORD_RULES, RESET_PASSWORD_RULES, CHANGE_PASSWORD_RULES, PROFILE_RULES, USER_ROLES_MATRIX_RULES, ACCESS_MATRIX_RULES, MASTER_SETTINGS_RULES } from './validateDesign.js';

/**
 * Ready-made pages using sample designs.
 * Use these for quick setup, or build your own with the controllers + your own designs.
 */

export function LoginPage(props) {
  var controller = useLoginController(props);
  var ref = useDesignValidator('LoginPage', LOGIN_RULES);
  return <div ref={ref}><LoginSample {...controller} /></div>;
}

export function RegisterPage(props) {
  var controller = useRegisterController(props);
  var ref = useDesignValidator('RegisterPage', REGISTER_RULES);
  return <div ref={ref}><RegisterSample {...controller} /></div>;
}

export function ForgotPasswordPage() {
  var controller = useForgotPasswordController();
  var ref = useDesignValidator('ForgotPasswordPage', FORGOT_PASSWORD_RULES);
  return <div ref={ref}><ForgotPasswordSample {...controller} /></div>;
}

export function ResetPasswordPage() {
  var controller = useResetPasswordController();
  var ref = useDesignValidator('ResetPasswordPage', RESET_PASSWORD_RULES);
  return <div ref={ref}><ResetPasswordSample {...controller} /></div>;
}

export function ActivatePage() {
  var controller = useActivateController();
  return <ActivateSample {...controller} />;
}

export function NotActivatedPage() {
  return <NotActivatedSample />;
}

export function ChangePasswordPage(props) {
  var controller = useChangePasswordController(props);
  var ref = useDesignValidator('ChangePasswordPage', CHANGE_PASSWORD_RULES);
  return <div ref={ref}><ChangePasswordSample {...controller} /></div>;
}

export function ProfilePage(props) {
  var controller = useProfileController(props);
  var ref = useDesignValidator('ProfilePage', PROFILE_RULES);
  return <div ref={ref}><ProfileSample {...controller} /></div>;
}

export function UserRolesPage(props) {
  var controller = useUserRolesController(props);
  var ref = useDesignValidator('UserRolesPage', USER_ROLES_MATRIX_RULES);
  return <div ref={ref}><UserRolesMatrixSample {...controller} /></div>;
}

export function AccessMatrixPage(props) {
  var controller = useAccessMatrixController(props);
  var ref = useDesignValidator('AccessMatrixPage', ACCESS_MATRIX_RULES);
  return <div ref={ref}><AccessMatrixSample {...controller} /></div>;
}

export function MasterSettingsPage(props) {
  var controller = useMasterSettingsController(props);
  var ref = useDesignValidator('MasterSettingsPage', MASTER_SETTINGS_RULES);
  return <div ref={ref}><MasterSettingsSample {...controller} /></div>;
}

export function TenantPage(props) {
  var controller = useTenantController(props);
  return <TenantSample {...controller} />;
}

export function TenantPickerPage(props) {
  var controller = useTenantPickerController(props);
  return <TenantPickerSample {...controller} />;
}
