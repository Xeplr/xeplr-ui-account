import { memo, useState, useMemo } from 'react';
import AccountMenu from './AccountMenu.jsx';
import NotificationsBell from './NotificationsBell.jsx';

// The ENTIRE nav when drawerItems is non-empty — NavPage renders this instead
// of (never alongside) the top bar, see pages.jsx. A pure overlay: `position:
// fixed` (nav.css), pinned to (0,0), full height — it never pushes or resizes
// anything else on the page, completely decoupled from the app's own content.
// Two states: icon-only (collapsed, `drawerOpen=false`) and
// icon+label+groups+search+promo (expanded). Toggled by clicking its own
// logo. Settings + notifications live in its footer (bottom-pinned) instead
// of a top bar, since there isn't one — same accountItems/notifications the
// top bar would have gotten, just rendered here instead.
//
// Items are bucketed by their optional `group` — ungrouped items render first
// (no header), grouped ones under a section header, groups in first-seen order.
function bucketItems(items) {
  var ungrouped = [];
  var groupOrder = [];
  var groups = {};
  items.forEach(function(item) {
    if (!item.group) {
      ungrouped.push(item);
      return;
    }
    if (!groups[item.group]) {
      groups[item.group] = [];
      groupOrder.push(item.group);
    }
    groups[item.group].push(item);
  });
  return { ungrouped: ungrouped, groupOrder: groupOrder, groups: groups };
}

function NavDrawer({
  drawerOpen, toggleDrawer, drawerItems, expandedLogo, logo, drawerPromo,
  user, accountItems, notifications, accountOpen, toggleAccount, closeAccount, accountRef, logout
}) {
  var [query, setQuery] = useState('');

  var visibleItems = useMemo(function() {
    if (!drawerOpen || !query.trim()) return drawerItems;
    var q = query.trim().toLowerCase();
    return drawerItems.filter(function(item) { return item.name.toLowerCase().indexOf(q) !== -1; });
  }, [drawerItems, query, drawerOpen]);

  var buckets = useMemo(function() { return bucketItems(visibleItems); }, [visibleItems]);

  function renderItem(item) {
    return (
      <button
        key={item.name}
        type="button"
        className="xeplr-nav-drawer-link"
        onClick={item.clickHandler}
        title={item.name}
      >
        {item.icon && <span className="xeplr-nav-drawer-icon">{item.icon}</span>}
        {drawerOpen && <span className="xeplr-nav-drawer-label">{item.name}</span>}
      </button>
    );
  }

  return (
    <aside className={'xeplr-nav-drawer' + (drawerOpen ? ' xeplr-nav-drawer-expanded' : ' xeplr-nav-drawer-collapsed')}>
      <button
        type="button"
        className="xeplr-nav-drawer-toggle"
        onClick={toggleDrawer}
        aria-label={drawerOpen ? 'Collapse menu' : 'Expand menu'}
        aria-expanded={drawerOpen}
      >
        {logo && <img src={logo} alt="" className="xeplr-nav-drawer-logo" />}
      </button>
      {/* Own row below the toggle, not squeezed inline beside it — expandedLogo
          is typically a stacked icon+wordmark lockup (near-square, not a wide
          banner), so it needs real height to stay legible, not the icon's 22px.
          Additive, not a swap of the toggle's own image — no flicker either way. */}
      {drawerOpen && expandedLogo && (
        <img src={expandedLogo} alt="" className="xeplr-nav-drawer-expanded-logo" />
      )}

      {drawerOpen && (
        <input
          type="search"
          className="xeplr-nav-drawer-search"
          placeholder="Search"
          value={query}
          onChange={function(e) { setQuery(e.target.value); }}
        />
      )}

      <nav className="xeplr-nav-drawer-links">
        {buckets.ungrouped.map(renderItem)}
        {buckets.groupOrder.map(function(groupName) {
          return (
            <div key={groupName} className="xeplr-nav-drawer-group">
              {drawerOpen && <div className="xeplr-nav-drawer-group-label">{groupName}</div>}
              {buckets.groups[groupName].map(renderItem)}
            </div>
          );
        })}
        {visibleItems.length === 0 && drawerOpen && <div className="xeplr-nav-drawer-empty">No matches</div>}
      </nav>

      {drawerOpen && drawerPromo && <div className="xeplr-nav-drawer-promo">{drawerPromo}</div>}

      <div className="xeplr-nav-drawer-footer">
        <NotificationsBell notifications={notifications} label={drawerOpen ? 'Notifications' : undefined} />
        <AccountMenu
          placement="top" triggerLabel={drawerOpen ? 'Settings' : undefined}
          user={user} accountItems={accountItems}
          accountOpen={accountOpen} toggleAccount={toggleAccount} closeAccount={closeAccount}
          accountRef={accountRef} logout={logout}
        />
      </div>
    </aside>
  );
}

export default memo(NavDrawer);
