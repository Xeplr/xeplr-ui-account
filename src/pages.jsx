import { memo } from 'react';
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
import { useNavController } from './useNavController.js';
import { LoginSample, RegisterSample, ForgotPasswordSample, ResetPasswordSample, ActivateSample, NotActivatedSample, ChangePasswordSample, ProfileSample, UserRolesMatrixSample, AccessMatrixSample, MasterSettingsSample, NavTopSample, NavDrawer } from './designs/index.js';
import { useDesignValidator, LOGIN_RULES, REGISTER_RULES, FORGOT_PASSWORD_RULES, RESET_PASSWORD_RULES, CHANGE_PASSWORD_RULES, PROFILE_RULES, USER_ROLES_MATRIX_RULES, ACCESS_MATRIX_RULES, MASTER_SETTINGS_RULES, NAV_RULES } from './validateDesign.js';

/**
 * Ready-made pages: controller (the logic) + sample design (the look), wired together.
 *
 * Every page takes an optional `design` prop — pass your OWN design component to
 * re-skin the page while keeping the framework's controller + validation. The design
 * receives the controller's output as props (the same contract the sample honours), e.g.
 * LoginSample gets { email, setEmail, password, setPassword, error, loading, handleSubmit }.
 *
 *   <LoginPage design={MyLogin} onSuccess={...} />   // my look, framework logic
 *   <LoginPage onSuccess={...} />                     // framework look
 *
 * Any other props (onSuccess, etc.) flow through to the controller.
 */

export function LoginPage({ design, ...props }) {
  var controller = useLoginController(props);
  var ref = useDesignValidator('LoginPage', LOGIN_RULES);
  var View = design || LoginSample;
  return <div ref={ref}><View {...controller} /></div>;
}

export function RegisterPage({ design, ...props }) {
  var controller = useRegisterController(props);
  var ref = useDesignValidator('RegisterPage', REGISTER_RULES);
  var View = design || RegisterSample;
  return <div ref={ref}><View {...controller} /></div>;
}

export function ForgotPasswordPage({ design, ...props }) {
  var controller = useForgotPasswordController(props);
  var ref = useDesignValidator('ForgotPasswordPage', FORGOT_PASSWORD_RULES);
  var View = design || ForgotPasswordSample;
  return <div ref={ref}><View {...controller} /></div>;
}

export function ResetPasswordPage({ design, ...props }) {
  var controller = useResetPasswordController(props);
  var ref = useDesignValidator('ResetPasswordPage', RESET_PASSWORD_RULES);
  var View = design || ResetPasswordSample;
  return <div ref={ref}><View {...controller} /></div>;
}

export function ActivatePage({ design, ...props }) {
  var controller = useActivateController(props);
  var View = design || ActivateSample;
  return <View {...controller} />;
}

export function NotActivatedPage({ design }) {
  var View = design || NotActivatedSample;
  return <View />;
}

export function ChangePasswordPage({ design, ...props }) {
  var controller = useChangePasswordController(props);
  var ref = useDesignValidator('ChangePasswordPage', CHANGE_PASSWORD_RULES);
  var View = design || ChangePasswordSample;
  return <div ref={ref}><View {...controller} /></div>;
}

export function ProfilePage({ design, ...props }) {
  var controller = useProfileController(props);
  var ref = useDesignValidator('ProfilePage', PROFILE_RULES);
  var View = design || ProfileSample;
  return <div ref={ref}><View {...controller} /></div>;
}

export function UserRolesPage({ design, ...props }) {
  var controller = useUserRolesController(props);
  var ref = useDesignValidator('UserRolesPage', USER_ROLES_MATRIX_RULES);
  var View = design || UserRolesMatrixSample;
  return <div ref={ref}><View {...controller} /></div>;
}

export function AccessMatrixPage({ design, ...props }) {
  var controller = useAccessMatrixController(props);
  var ref = useDesignValidator('AccessMatrixPage', ACCESS_MATRIX_RULES);
  var View = design || AccessMatrixSample;
  return <div ref={ref}><View {...controller} /></div>;
}

export function MasterSettingsPage({ design, ...props }) {
  var controller = useMasterSettingsController(props);
  var ref = useDesignValidator('MasterSettingsPage', MASTER_SETTINGS_RULES);
  var View = design || MasterSettingsSample;
  return <div ref={ref}><View {...controller} /></div>;
}

// NavPage is memoized — unlike the other pages, it lives in your app's layout
// route alongside <Outlet/>, so it must not re-render when the routed page
// changes. Exactly ONE of two things renders, never both: if `drawerItems` is
// non-empty, the drawer rail (NavDrawer) IS the nav — it hosts settings,
// notifications, and everything else that would otherwise be in the top bar.
// Otherwise the top bar (`design`, defaults to NavTopSample) renders alone.
// `navMiddle` has no equivalent in the drawer (there's no middle slot in a
// vertical rail) — it's simply unused whenever a drawer is present.
// See useNavController.js for the drawerItems/settingsOverrides/notifications
// props this accepts.
function NavPageImpl({ design, logo, expandedLogo, navMiddle, drawerPromo, ...props }) {
  var controller = useNavController(props);
  var ref = useDesignValidator('NavPage', NAV_RULES);
  var TopBar = design || NavTopSample;
  var hasDrawer = controller.drawerItems.length > 0;
  return (
    <div ref={ref}>
      {hasDrawer ? (
        <NavDrawer
          {...controller}
          logo={logo}
          expandedLogo={expandedLogo}
          drawerPromo={drawerPromo}
        />
      ) : (
        <TopBar
          {...controller}
          logo={logo}
          navMiddle={navMiddle}
        />
      )}
    </div>
  );
}

export var NavPage = memo(NavPageImpl);
