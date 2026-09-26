import './admin.css';
import AdminTabs from './AdminTabs.jsx';
import { STATES, OVERRIDE_STATES, STATE_LABELS } from '../accessStates.js';

var ACTION_LABELS = { view: 'View Only', create: 'Create', edit: 'Add / Edit', delete: 'Delete' };
var ACTION_CLASSES = { view: 'xeplr-admin-action-view', create: 'xeplr-admin-action-edit', edit: 'xeplr-admin-action-edit', delete: 'xeplr-admin-action-delete' };
var UNCAT_TABS = [
  { key: 'apis', label: 'APIs' },
  { key: 'pages', label: 'Pages' },
  { key: 'elements', label: 'Elements' },
  { key: 'menus', label: 'Menus' },
];

export default function AccessMatrixSample({
  roles, modules, uncategorized, uncategorizedCount, uncatSubTab, setUncatSubTab,
  activeView, setActiveView, search, setSearch,
  loading, error, handleStateChange, handleItemToggle,
  isItemAssigned, isModuleSaving, isItemSaving, reload,
  appliesTo, setAppliesTo, scopeId, setScopeId, workspaces, users, statesSupported
}) {
  return (
    <div className="xeplr-admin-container">
      <AdminTabs />
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

      {activeView === 'modules' && renderScopeBar(appliesTo, setAppliesTo, scopeId, setScopeId, workspaces, users)}

      {activeView === 'modules' && statesSupported === false && (
        <div className="xeplr-admin-alert xeplr-admin-alert-info">
          Workspace and user overrides are not stored yet. Roles work today: Enabled, Disabled
          and Hidden.
        </div>
      )}

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
        renderModulesView(roles, modules, handleStateChange, isModuleSaving, appliesTo, scopeId)
      ) : (
        renderUncategorizedView(roles, uncategorized, uncatSubTab, setUncatSubTab, handleItemToggle, isItemAssigned, isItemSaving)
      )}
    </div>
  );
}

var SCOPE_OPTIONS = [
  { key: 'role', label: 'Roles' },
  { key: 'workspace', label: 'Workspace' },
  { key: 'user', label: 'User' },
];

function renderScopeBar(appliesTo, setAppliesTo, scopeId, setScopeId, workspaces, users) {
  var list = appliesTo === 'workspace' ? (workspaces || []) : appliesTo === 'user' ? (users || []) : [];
  return (
    <div className="xeplr-admin-scope-bar">
      <span className="xeplr-admin-scope-label">Applies to</span>
      <div id="xeplr-admin-access-scope" role="radiogroup" aria-label="Applies to" className="xeplr-admin-scope-options">
        {SCOPE_OPTIONS.map(function(opt) {
          var on = appliesTo === opt.key;
          return (
            <button key={opt.key} type="button" role="radio" aria-checked={on}
              className={'xeplr-admin-scope-option' + (on ? ' xeplr-admin-scope-option-active' : '')}
              onClick={function() { setAppliesTo(opt.key); }}>
              {opt.label}
            </button>
          );
        })}
      </div>
      {appliesTo !== 'role' && (
        <select id="xeplr-admin-access-scope-target" className="xeplr-admin-scope-select"
          value={scopeId} onChange={function(e) { setScopeId(e.target.value); }}>
          <option value="">{appliesTo === 'workspace' ? 'Choose a workspace…' : 'Choose a user…'}</option>
          {list.map(function(x) {
            return <option key={x.id} value={x.id}>{x.name || x.email || x.id}</option>;
          })}
        </select>
      )}
    </div>
  );
}

function stateSelect(value, options, onChange, disabled, label) {
  return (
    <select aria-label={label} value={value} disabled={disabled}
      className={'xeplr-admin-state-select xeplr-admin-state-' + value}
      onChange={function(e) { onChange(e.target.value); }}>
      {value === 'partial' && <option value="partial" disabled>{STATE_LABELS.partial}</option>}
      {options.map(function(s) { return <option key={s} value={s}>{STATE_LABELS[s]}</option>; })}
    </select>
  );
}

function renderModulesView(roles, modules, handleStateChange, isModuleSaving, appliesTo, scopeId) {
  if (modules.length === 0) {
    return <div className="xeplr-admin-empty-box">No modules found. Items need a <code>module:action</code> group value to appear here.</div>;
  }
  if (appliesTo !== 'role' && !scopeId) {
    return <div className="xeplr-admin-empty-box">Choose a {appliesTo} above to see and change its overrides.</div>;
  }
  var byRole = appliesTo === 'role';

  return (
    <div className="xeplr-admin-matrix-wrapper">
      <table className="xeplr-admin-matrix" role="grid">
        <thead>
          <tr>
            <th className="xeplr-admin-sticky-col xeplr-admin-module-col">Module</th>
            <th className="xeplr-admin-action-col">Action</th>
            {byRole ? roles.map(function(role) {
              return <th key={role.id} className="xeplr-admin-role-header">{role.name}</th>;
            }) : <th className="xeplr-admin-role-header">State</th>}
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
                  {byRole ? roles.map(function(role) {
                    return (
                      <td key={role.id} className="xeplr-admin-cell">
                        {stateSelect(actionEntry.getCellState(role.id), STATES,
                          function(next) { handleStateChange(mod.name, actionEntry.action, role.id, next); },
                          isModuleSaving(mod.name, actionEntry.action, role.id),
                          mod.name + ' ' + actionLabel + ' for ' + role.name)}
                      </td>
                    );
                  }) : (
                    <td className="xeplr-admin-cell">
                      {stateSelect(actionEntry.getOverrideState(), OVERRIDE_STATES,
                        function(next) { handleStateChange(mod.name, actionEntry.action, null, next); },
                        isModuleSaving(mod.name, actionEntry.action, null),
                        mod.name + ' ' + actionLabel)}
                    </td>
                  )}
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
