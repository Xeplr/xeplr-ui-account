import { memo } from 'react';
import { Link } from 'react-router-dom';

// The settings trigger — a gear icon, parallel to NotificationsBell's bell
// icon — and its dropdown. Used two places: top-right of the top bar
// (`placement="bottom"`, the default — trigger is near the top of the
// viewport, so the menu opens downward) and the bottom of the drawer rail
// (`placement="top"` — trigger is near the bottom of the viewport, so the
// menu opens upward instead of running off-screen). Memoized and given only
// its own slice of props — it does not receive drawerOpen/drawerItems, so
// drawer interactions never touch it. accountItems is already resolved +
// role-filtered + ordered (overrides above builtin) by useNavController —
// this component just renders whatever it's handed. `triggerLabel` is
// optional text next to the gear icon — the drawer passes "Settings" when
// expanded (matching how its other items show a label), omits it when
// collapsed; the top bar never passes it (icon-only, no room).
function AccountMenu({
  user, accountItems, placement, triggerLabel,
  accountOpen, toggleAccount, closeAccount, accountRef, logout
}) {
  var label = (user && (user.name || user.email)) || 'Account';
  var initial = label.charAt(0).toUpperCase();

  return (
    <div ref={accountRef} className={'xeplr-nav-account' + (accountOpen ? ' xeplr-nav-account-open' : '')}>
      <button
        type="button"
        className={'xeplr-nav-settings-trigger' + (triggerLabel ? ' xeplr-nav-settings-trigger-labeled' : '')}
        onClick={toggleAccount}
        aria-haspopup="menu"
        aria-expanded={accountOpen}
        aria-label="Settings"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {triggerLabel && <span className="xeplr-nav-settings-trigger-label">{triggerLabel}</span>}
      </button>

      {accountOpen && (
        <div className={'xeplr-nav-account-menu' + (placement === 'top' ? ' xeplr-nav-account-menu-top' : '')} role="menu">
          <div className="xeplr-nav-account-header">
            {user && user.profilePicUrl
              ? <img src={user.profilePicUrl} alt="" className="xeplr-nav-avatar xeplr-nav-avatar-img" />
              : <span className="xeplr-nav-avatar">{initial}</span>}
            <div className="xeplr-nav-account-header-text">
              <div className="xeplr-nav-account-name">{label}</div>
              {user && user.email && user.name && <div className="xeplr-nav-account-email">{user.email}</div>}
            </div>
          </div>

          {(accountItems || []).map(function(item) {
            return (
              <Link key={item.key || item.name} to={item.path} className="xeplr-nav-account-item" role="menuitem" onClick={closeAccount}>
                {item.label || item.name}
              </Link>
            );
          })}

          <div className="xeplr-nav-account-divider" />
          <button type="button" className="xeplr-nav-account-item xeplr-nav-account-logout" role="menuitem" onClick={logout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(AccountMenu);
