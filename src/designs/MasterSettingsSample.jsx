import './admin.css';

export default function MasterSettingsSample({
  tabs, activeTab, setActiveTab, currentTab, items, search, setSearch,
  loading, error, saving, editingItem, editForm, groupNames,
  startAdd, startEdit, cancelEdit, updateField, handleSave, handleDelete, reload
}) {
  return (
    <div className="xeplr-admin-container">
      <div className="xeplr-admin-header">
        <h2>Master Settings</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={startAdd} className="xeplr-admin-btn-primary" disabled={saving || editingItem === '__new__'}>
            + Add {currentTab.label.replace(/s$/, '')}
          </button>
          <button type="button" onClick={reload} className="xeplr-admin-btn-secondary">Refresh</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="xeplr-admin-tabs" role="tablist">
        {tabs.map(function(tab) {
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={'xeplr-admin-tab' + (activeTab === tab.key ? ' xeplr-admin-tab-active' : '')}
              onClick={function() { setActiveTab(tab.key); }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="xeplr-admin-toolbar">
        <input
          id="xeplr-admin-master-search"
          type="text"
          placeholder={'Search ' + currentTab.label.toLowerCase() + '...'}
          value={search}
          onChange={function(e) { setSearch(e.target.value); }}
          className="xeplr-admin-search"
        />
      </div>

      {error && <div className="xeplr-admin-alert xeplr-admin-alert-error">{error}</div>}

      {loading ? (
        <div className="xeplr-admin-loading">Loading...</div>
      ) : (
        <div className="xeplr-admin-matrix-wrapper">
          <table className="xeplr-admin-matrix xeplr-admin-master-table">
            <thead>
              <tr>
                {currentTab.fields.map(function(field) {
                  return <th key={field.key} className={field.key === 'name' ? 'xeplr-admin-sticky-col' : ''}>{field.label}</th>;
                })}
                <th className="xeplr-admin-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New item row */}
              {editingItem === '__new__' && (
                <tr className="xeplr-admin-editing-row">
                  {currentTab.fields.map(function(field) {
                    return (
                      <td key={field.key} className={field.key === 'name' ? 'xeplr-admin-sticky-col' : ''}>
                        {renderField(field, editForm[field.key], function(val) { updateField(field.key, val); }, groupNames)}
                      </td>
                    );
                  })}
                  <td className="xeplr-admin-actions-col">
                    <div className="xeplr-admin-action-btns">
                      <button onClick={handleSave} disabled={saving} className="xeplr-admin-btn-save" title="Save">
                        {saving ? '...' : '\u2713'}
                      </button>
                      <button onClick={cancelEdit} className="xeplr-admin-btn-cancel" title="Cancel">
                        {'\u2715'}
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {items.length === 0 && editingItem !== '__new__' ? (
                <tr><td colSpan={currentTab.fields.length + 1} className="xeplr-admin-empty">No {currentTab.label.toLowerCase()} found</td></tr>
              ) : (
                items.map(function(item) {
                  var isEditing = editingItem === item.id;
                  return (
                    <tr key={item.id} className={isEditing ? 'xeplr-admin-editing-row' : ''}>
                      {currentTab.fields.map(function(field) {
                        var cellClass = field.key === 'name' ? 'xeplr-admin-sticky-col' : '';
                        if (isEditing) {
                          return (
                            <td key={field.key} className={cellClass}>
                              {renderField(field, editForm[field.key], function(val) { updateField(field.key, val); }, groupNames)}
                            </td>
                          );
                        }
                        return (
                          <td key={field.key} className={cellClass}>
                            {renderValue(field, item[field.key])}
                          </td>
                        );
                      })}
                      <td className="xeplr-admin-actions-col">
                        {isEditing ? (
                          <div className="xeplr-admin-action-btns">
                            <button onClick={handleSave} disabled={saving} className="xeplr-admin-btn-save" title="Save">
                              {saving ? '...' : '\u2713'}
                            </button>
                            <button onClick={cancelEdit} className="xeplr-admin-btn-cancel" title="Cancel">
                              {'\u2715'}
                            </button>
                          </div>
                        ) : (
                          <div className="xeplr-admin-action-btns">
                            <button onClick={function() { startEdit(item); }} className="xeplr-admin-btn-edit" title="Edit" disabled={editingItem !== null}>
                              {'\u270E'}
                            </button>
                            <button onClick={function() { if (confirm('Delete this item?')) handleDelete(item.id); }} className="xeplr-admin-btn-delete" title="Delete" disabled={saving || editingItem !== null}>
                              {'\u2715'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function renderField(field, value, onChange, groupNames) {
  if (field.type === 'boolean') {
    return (
      <label className="xeplr-admin-toggle">
        <input
          type="checkbox"
          checked={!!value}
          onChange={function(e) { onChange(e.target.checked ? 1 : 0); }}
        />
        <span className="xeplr-admin-checkmark" />
      </label>
    );
  }

  if (field.type === 'group') {
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <select
          className="xeplr-admin-inline-input xeplr-admin-group-input"
          style={{ flex: 1 }}
          value={(groupNames || []).indexOf(value) !== -1 ? value : ''}
          onChange={function(e) { onChange(e.target.value); }}
        >
          <option value="">-- select or type new --</option>
          {(groupNames || []).map(function(name) {
            return <option key={name} value={name}>{name}</option>;
          })}
        </select>
        <input
          type="text"
          value={value || ''}
          onChange={function(e) { onChange(e.target.value); }}
          placeholder={field.placeholder || 'or type new group'}
          className="xeplr-admin-inline-input xeplr-admin-group-input"
          style={{ flex: 1 }}
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      value={value || ''}
      onChange={function(e) { onChange(e.target.value); }}
      placeholder={field.placeholder || ''}
      className="xeplr-admin-inline-input"
      autoFocus={field.required}
    />
  );
}

function renderValue(field, value) {
  if (field.type === 'boolean') {
    return <span className={value ? 'xeplr-admin-badge-yes' : 'xeplr-admin-badge-no'}>{value ? 'Yes' : 'No'}</span>;
  }

  var isGroup = field.key.toLowerCase().includes('group');
  if (isGroup && value) {
    return <span className="xeplr-admin-group-tag">{value}</span>;
  }

  return <span className={field.key === 'name' ? 'xeplr-admin-item-name' : ''}>{value || '\u2014'}</span>;
}
