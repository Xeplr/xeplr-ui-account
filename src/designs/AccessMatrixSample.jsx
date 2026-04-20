import './admin.css';

var ACTION_LABELS = { view: 'View Only', edit: 'Add / Edit', delete: 'Delete' };
var ACTION_CLASSES = { view: 'xeplr-admin-action-view', edit: 'xeplr-admin-action-edit', delete: 'xeplr-admin-action-delete' };
var UNCAT_TABS = [
  { key: 'apis', label: 'APIs' },
  { key: 'pages', label: 'Pages' },
  { key: 'elements', label: 'Elements' },
  { key: 'menus', label: 'Menus' },
];

export default function AccessMatrixSample({
  roles, modules, uncategorized, uncategorizedCount, uncatSubTab, setUncatSubTab,
  activeView, setActiveView, search, setSearch,
  loading, error, handleModuleToggle, handleItemToggle,
  isItemAssigned, isModuleSaving, isItemSaving, reload
}) {
  return (
    <div className="xeplr-admin-container">
      <div className="xeplr-admin-header">
        <h2>Access Matrix</h2>
        <button type="button" onClick={reload} className="xeplr-admin-btn-secondary">Refresh</button>
      </div>

      {/* Top-level tabs: Modules vs Uncategorized */}
      <div className="xeplr-admin-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeView === 'modules'}
          className={'xeplr-admin-tab' + (activeView === 'modules' ? ' xeplr-admin-tab-active' : '')}
          onClick={function() { setActiveView('modules'); }}
        >
          Modules
        </button>
        <button
          role="tab"
          aria-selected={activeView === 'uncategorized'}
          className={'xeplr-admin-tab' + (activeView === 'uncategorized' ? ' xeplr-admin-tab-active' : '')}
          onClick={function() { setActiveView('uncategorized'); }}
        >
          Uncategorized
          {uncategorizedCount > 0 && <span className="xeplr-admin-tab-badge">{uncategorizedCount}</span>}
        </button>
      </div>

      {/* Search */}
      <div className="xeplr-admin-toolbar">
        <input
          id="xeplr-admin-access-search"
          type="text"
          placeholder={activeView === 'modules' ? 'Search modules...' : 'Search items...'}
          value={search}
          onChange={function(e) { setSearch(e.target.value); }}
          className="xeplr-admin-search"
        />
      </div>

      {error && <div className="xeplr-admin-alert xeplr-admin-alert-error">{error}</div>}

      {loading ? (
        <div className="xeplr-admin-loading">Loading...</div>
      ) : activeView === 'modules' ? (
        renderModulesView(roles, modules, handleModuleToggle, isModuleSaving)
      ) : (
        renderUncategorizedView(roles, uncategorized, uncatSubTab, setUncatSubTab, handleItemToggle, isItemAssigned, isItemSaving)
      )}
    </div>
  );
}

function renderModulesView(roles, modules, handleModuleToggle, isModuleSaving) {
  if (modules.length === 0) {
    return <div className="xeplr-admin-empty-box">No modules found. Items need a <code>module:action</code> group value to appear here.</div>;
  }

  return (
    <div className="xeplr-admin-matrix-wrapper">
      <table className="xeplr-admin-matrix" role="grid">
        <thead>
          <tr>
            <th className="xeplr-admin-sticky-col xeplr-admin-module-col">Module</th>
            <th className="xeplr-admin-action-col">Action</th>
            {roles.map(function(role) {
              return <th key={role.id} className="xeplr-admin-role-header">{role.name}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {modules.map(function(mod) {
            return mod.actions.map(function(actionEntry, idx) {
              var actionLabel = ACTION_LABELS[actionEntry.action] || actionEntry.action;
              var actionClass = ACTION_CLASSES[actionEntry.action] || '';
              return (
                <tr key={mod.name + ':' + actionEntry.action} className={idx === 0 ? 'xeplr-admin-module-first-row' : ''}>
                  {idx === 0 && (
                    <td className="xeplr-admin-sticky-col xeplr-admin-module-name" rowSpan={mod.actions.length}>
                      {mod.name}
                    </td>
                  )}
                  <td className={'xeplr-admin-action-cell ' + actionClass}>
                    {actionLabel}
                  </td>
                  {roles.map(function(role) {
                    var state = actionEntry.getRoleState(role.id);
                    var isSaving = isModuleSaving(mod.name, actionEntry.action, role.id);
                    return (
                      <td key={role.id} className="xeplr-admin-cell">
                        <label className="xeplr-admin-toggle">
                          <input
                            type="checkbox"
                            checked={state === 'all'}
                            ref={function(el) {
                              if (el) el.indeterminate = state === 'partial';
                            }}
                            disabled={isSaving}
                            onChange={function() { handleModuleToggle(mod.name, actionEntry.action, role.id, state); }}
                          />
                          <span className={'xeplr-admin-checkmark' + (state === 'partial' ? ' xeplr-admin-partial' : '') + (isSaving ? ' xeplr-admin-saving' : '')} />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderUncategorizedView(roles, uncategorized, uncatSubTab, setUncatSubTab, handleItemToggle, isItemAssigned, isItemSaving) {
  var items = uncategorized[uncatSubTab] || [];

  return (
    <div>
      {/* Sub-tabs for technical types */}
      <div className="xeplr-admin-subtabs">
        {UNCAT_TABS.map(function(tab) {
          var count = (uncategorized[tab.key] || []).length;
          return (
            <button
              key={tab.key}
              className={'xeplr-admin-subtab' + (uncatSubTab === tab.key ? ' xeplr-admin-subtab-active' : '')}
              onClick={function() { setUncatSubTab(tab.key); }}
            >
              {tab.label}
              {count > 0 && <span className="xeplr-admin-subtab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="xeplr-admin-matrix-wrapper">
        <table className="xeplr-admin-matrix" role="grid">
          <thead>
            <tr>
              <th className="xeplr-admin-sticky-col">Name</th>
              {roles.map(function(role) {
                return <th key={role.id} className="xeplr-admin-role-header">{role.name}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={roles.length + 1} className="xeplr-admin-empty">No uncategorized items</td></tr>
            ) : (
              items.map(function(item) {
                return (
                  <tr key={item.id}>
                    <td className="xeplr-admin-sticky-col xeplr-admin-item-name">{item.name}</td>
                    {roles.map(function(role) {
                      var assigned = isItemAssigned(item, role.id);
                      var savingThis = isItemSaving(uncatSubTab, item.id, role.id);
                      return (
                        <td key={role.id} className="xeplr-admin-cell">
                          <label className="xeplr-admin-toggle">
                            <input
                              type="checkbox"
                              checked={assigned}
                              disabled={savingThis}
                              onChange={function() { handleItemToggle(uncatSubTab, item.id, role.id, assigned); }}
                            />
                            <span className={'xeplr-admin-checkmark' + (savingThis ? ' xeplr-admin-saving' : '')} />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
