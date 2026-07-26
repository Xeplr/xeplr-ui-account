import { memo } from 'react';
import AccountMenu from './AccountMenu.jsx';
import NotificationsBell from './NotificationsBell.jsx';
import './nav.css';

// The (default, swappable via NavPage's `design` prop) top bar: 10% / 80% / 10%
// columns. Only ever rendered when there's NO drawer — NavPage renders the
// drawer instead of this, never both (see pages.jsx). Left holds the small
// `logo`, middle is `navMiddle` (a fully exposed slot, e.g. an app's
// company/workspace picker), right is always the settings trigger plus the
// notifications bell when `notifications` is set.
function NavTopSample({
  logo, navMiddle,
  user, accountItems, notifications, accountOpen, toggleAccount, closeAccount, accountRef, logout
}) {
  return (
    <header className="xeplr-nav xeplr-nav-top">
      <div className="xeplr-nav-left">
        {logo && <img src={logo} alt="" className="xeplr-nav-logo" />}
      </div>
      <div className="xeplr-nav-middle">{navMiddle}</div>
      <div className="xeplr-nav-right">
        <NotificationsBell notifications={notifications} />
        <AccountMenu
          user={user} accountItems={accountItems}
          accountOpen={accountOpen} toggleAccount={toggleAccount} closeAccount={closeAccount}
          accountRef={accountRef} logout={logout}
        />
      </div>
    </header>
  );
}

export default memo(NavTopSample);
