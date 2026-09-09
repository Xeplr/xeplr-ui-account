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
  user, accountItems, notifications, accountOpen, toggleAccount, closeAccount, accountRef, logout,
  hideFooterIcons,
  drawerWidth, drawerResizing, startDrawerResize, resetDrawerWidth, nudgeDrawerWidth, drawerWidthBounds
}) {
  var [query, setQuery] = useState('');

  var bounds = drawerWidthBounds || { min: 180, max: 480, step: 16 };

  // Arrow keys resize, Home/End jump to the stops — the handle is focusable,
  // so everything the drag does has to be reachable from the keyboard too.
  function onResizeKeyDown(e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeDrawerWidth(-bounds.step); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nudgeDrawerWidth(bounds.step); }
    else if (e.key === 'Home') { e.preventDefault(); nudgeDrawerWidth(-Infinity); }
    else if (e.key === 'End') { e.preventDefault(); nudgeDrawerWidth(Infinity); }
    else if (e.key === 'Enter') { e.preventDefault(); resetDrawerWidth(); }
  }

  var visibleItems = useMemo(function() {
    if (!drawerOpen || !query.trim()) return drawerItems;
    var q = query.trim().toLowerCase();
    return drawerItems.filter(function(item) { return item.name.toLowerCase().indexOf(q) !== -1; });
  }, [drawerItems, query, drawerOpen]);

  var buckets = useMemo(function() { return bucketItems(visibleItems); }, [visibleItems]);

  function renderItem(item) {
    // A COUNT THAT HAS TO BE SEEN FROM WHEREVER YOU ARE.
    //
    // Optional `item.badge` — a number or a short string. It renders as a pill
    // beside the label when the drawer is expanded and as a dot on the icon
    // when it is collapsed, because the collapsed rail is the state most
    // people leave it in and a badge only visible when expanded is a badge
    // that does not do its job.
    //
    // 0, null and undefined all render NOTHING. A pill reading "0" is noise
    // that trains people to stop looking at the pill.
    var badge = item.badge === 0 || item.badge == null || item.badge === '' ? null : item.badge;
    return (
      <button
        key={item.name}
        type="button"
        className={'xeplr-nav-drawer-link' + (badge ? ' xeplr-nav-drawer-link-badged' : '')}
        onClick={item.clickHandler}
        // The count belongs in the tooltip too — the collapsed dot says
        // "something", and the hover has to say how many.
        title={badge ? item.name + ' (' + badge + ')' : item.name}
      >
        {item.icon && (
          <span className="xeplr-nav-drawer-icon">
            {item.icon}
            {badge && !drawerOpen && <span className="xeplr-nav-drawer-dot" aria-hidden="true" />}
          </span>
        )}
        {drawerOpen && <span className="xeplr-nav-drawer-label">{item.name}</span>}
        {drawerOpen && badge && <span className="xeplr-nav-drawer-badge">{badge}</span>}
      </button>
    );
  }

  return (
    <aside
      className={
        'xeplr-nav-drawer'
        + (drawerOpen ? ' xeplr-nav-drawer-expanded' : ' xeplr-nav-drawer-collapsed')
        + (drawerResizing ? ' xeplr-nav-drawer-resizing' : '')
      }
      /* Inline width ONLY when expanded — collapsed is the fixed icon rail and
         nav.css keeps owning that number. Inline because it changes per
         pointermove; a stylesheet cannot express a live drag. */
      style={drawerOpen && drawerWidth ? { width: drawerWidth + 'px' } : undefined}
    >
      <button
        type="button"
        className="xeplr-nav-drawer-toggle"
        onClick={toggleDrawer}
        aria-label={drawerOpen ? 'Collapse menu' : 'Expand menu'}
        aria-expanded={drawerOpen}
      >
        {/* ONE MARK AT A TIME.
            expandedLogo is a stacked icon+wordmark lockup — it CONTAINS this
            icon — so rendering both put the same mark on screen twice, one
            above the other. Collapsed, the icon is the brand and the thing you
            click to expand; open, the lockup is the brand and this is only the
            collapse control, which the chevron says better than a second copy
            of the logo. */}
        {drawerOpen && expandedLogo
          ? <span className="xeplr-nav-drawer-collapse" aria-hidden="true">«</span>
          : (logo && <img src={logo} alt="" className="xeplr-nav-drawer-logo" />)}
      </button>
      {/* Own row below the toggle, not squeezed inline beside it — a stacked
          lockup needs real height to stay legible, not the icon's 22px. */}
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

      {!hideFooterIcons && (
        <div className="xeplr-nav-drawer-footer">
          <NotificationsBell notifications={notifications} label={drawerOpen ? 'Notifications' : undefined} />
          <AccountMenu
            placement="top" triggerLabel={drawerOpen ? 'Settings' : undefined}
            user={user} accountItems={accountItems}
            accountOpen={accountOpen} toggleAccount={toggleAccount} closeAccount={closeAccount}
            accountRef={accountRef} logout={logout}
          />
        </div>
      )}

      {/* LAST child and absolutely positioned, so it sits over the drawer's
          right border at any height without taking part in the column layout
          above it. Only when expanded: there is nothing to widen on a 60px
          icon rail, and a resize handle there would just fight the toggle. */}
      {drawerOpen && (
        <div
          className="xeplr-nav-drawer-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize menu"
          aria-valuenow={drawerWidth}
          aria-valuemin={bounds.min}
          aria-valuemax={bounds.max}
          tabIndex={0}
          onPointerDown={startDrawerResize}
          onDoubleClick={resetDrawerWidth}
          onKeyDown={onResizeKeyDown}
          title="Drag to resize — double-click to reset"
        />
      )}
    </aside>
  );
}

export default memo(NavDrawer);
