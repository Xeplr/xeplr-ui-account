import { memo } from 'react';

// Its own control, separate from AccountMenu on purpose — memoized independently
// so a notification count changing doesn't re-render the account dropdown (and
// vice versa). `notifications` is optional; omit it to hide the bell entirely.
// Wire a real feed later (open a popover, etc.) without touching the other parts.
// `label` is optional text shown next to the icon — the drawer passes
// "Notifications" when expanded (matching how its other items show a label),
// omits it when collapsed; the top bar never passes it (icon-only, no room).
function NotificationsBell({ notifications, label }) {
  if (!notifications) return null;
  var count = notifications.count;

  return (
    <button
      type="button"
      className={'xeplr-nav-bell' + (label ? ' xeplr-nav-bell-labeled' : '')}
      onClick={notifications.onClick}
      aria-label={count > 0 ? count + ' unread notifications' : 'Notifications'}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && <span className="xeplr-nav-badge">{count > 9 ? '9+' : count}</span>}
      {label && <span className="xeplr-nav-bell-label">{label}</span>}
    </button>
  );
}

export default memo(NotificationsBell);
