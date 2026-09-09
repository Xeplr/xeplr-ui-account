import { memo } from 'react';
import AccountMenu from './AccountMenu.jsx';
import NotificationsBell from './NotificationsBell.jsx';
import './nav.css';

// A minimal top-right overlay — just the notifications bell + account/settings
// trigger, no logo/middle slot/header bar around them. Opt-in via NavPage's
// `floatingSettings` prop, for layouts (e.g. an icon drawer) that want these
// two floating over the page instead of pinned to the drawer's own footer.
function NavFloatingSettings({
  user, accountItems, notifications, accountOpen, toggleAccount, closeAccount, accountRef, logout
}) {
  return (
    <div className="xeplr-nav-floating">
      <NotificationsBell notifications={notifications} />
      <AccountMenu
        user={user} accountItems={accountItems}
        accountOpen={accountOpen} toggleAccount={toggleAccount} closeAccount={closeAccount}
        accountRef={accountRef} logout={logout}
      />
    </div>
  );
}

export default memo(NavFloatingSettings);
