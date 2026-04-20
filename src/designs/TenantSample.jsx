import './admin.css';

export default function TenantSample({
  tenants, users, loading, error, saving, editingItem, editForm,
  activeTab, setActiveTab, search, setSearch, label, labels,
  startAdd, startEdit, cancelEdit, updateField, handleSave, handleDelete,
  handleAssignUser, isUserAssignedTenant, reload, level
}) {
  return (
    <div className="xeplr-admin-container">
      <div className="xeplr-admin-header">
        <h2>{labels} Management</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'tenants' && (
            <button type="button" onClick={startAdd} className="xeplr-admin-btn-primary" disabled={saving || editingItem === '__new__'}>
              + Add {label}
            </button>
          )}
          <button type="button" onClick={reload} className="xeplr-admin-btn-secondary">Refresh</button>
        </div>
      </div>

      <div className="xeplr-admin-tabs" role="tablist">
        <button role="tab" className={'xeplr-admin-tab' + (activeTab === 'tenants' ? ' xeplr-admin-tab-active' : '')} onClick={function() { setActiveTab('tenants'); setSearch(''); }}>
          {labels}
        </button>
        <button role="tab" className={'xeplr-admin-tab' + (activeTab === 'users' ? ' xeplr-admin-tab-active' : '')} onClick={function() { setActiveTab('users'); setSearch(''); }}>
          Assign Users
        </button>
      </div>

      <div className="xeplr-admin-toolbar">
        <input type="text" placeholder={'Search ' + (activeTab === 'tenants' ? labels.toLowerCase() : 'users') + '...'} value={search} onChange={function(e) { setSearch(e.target.value); }} className="xeplr-admin-search" />
      </div>

      {error && <div className="xeplr-admin-alert xeplr-admin-alert-error">{error}</div>}

      {loading ? (
        <div className="xeplr-admin-loading">Loading...</div>
      ) : activeTab === 'tenants' ? (
        renderTenantList(tenants, editingItem, editForm, saving, label, startEdit, cancelEdit, updateField, handleSave, handleDelete)
      ) : (
        renderUserAssignment(users, tenants, search, handleAssignUser, isUserAssignedTenant, label)
      )}
    </div>
  );
}

function renderTenantList(tenants, editingItem, editForm, saving, label, startEdit, cancelEdit, updateField, handleSave, handleDelete) {
  return (
    <div className="xeplr-admin-matrix-wrapper">
      <table className="xeplr-admin-matrix xeplr-admin-master-table">
        <thead>
          <tr>
            <th className="xeplr-admin-sticky-col">Name</th>
            <th>Code</th>
            <th>Description</th>
            <th className="xeplr-admin-actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {editingItem === '__new__' && (
            <tr className="xeplr-admin-editing-row">
              <td className="xeplr-admin-sticky-col">
                <input type="text" className="xeplr-admin-inline-input" value={editForm.name || ''} onChange={function(e) { updateField('name', e.target.value); }} placeholder={label + ' name'} autoFocus />
              </td>
              <td>
                <input type="text" className="xeplr-admin-inline-input xeplr-admin-group-input" value={editForm.code || ''} onChange={function(e) { updateField('code', e.target.value); }} placeholder="Short code" />
              </td>
              <td>
                <input type="text" className="xeplr-admin-inline-input" value={editForm.description || ''} onChange={function(e) { updateField('description', e.target.value); }} placeholder="Description" />
              </td>
              <td className="xeplr-admin-actions-col">
                <div className="xeplr-admin-action-btns">
                  <button onClick={handleSave} disabled={saving} className="xeplr-admin-btn-save" title="Save">{'\u2713'}</button>
                  <button onClick={cancelEdit} className="xeplr-admin-btn-cancel" title="Cancel">{'\u2715'}</button>
                </div>
              </td>
            </tr>
          )}
          {tenants.length === 0 && editingItem !== '__new__' ? (
            <tr><td colSpan="4" className="xeplr-admin-empty">No {label.toLowerCase()}s found</td></tr>
          ) : (
            tenants.map(function(t) {
              var isEditing = editingItem === t.id;
              return (
                <tr key={t.id} className={isEditing ? 'xeplr-admin-editing-row' : ''}>
                  <td className="xeplr-admin-sticky-col">
                    {isEditing ? (
                      <input type="text" className="xeplr-admin-inline-input" value={editForm.name || ''} onChange={function(e) { updateField('name', e.target.value); }} />
                    ) : (
                      <span className="xeplr-admin-item-name">{t.name}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="text" className="xeplr-admin-inline-input xeplr-admin-group-input" value={editForm.code || ''} onChange={function(e) { updateField('code', e.target.value); }} />
                    ) : (
                      t.code ? <span className="xeplr-admin-group-tag">{t.code}</span> : '\u2014'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="text" className="xeplr-admin-inline-input" value={editForm.description || ''} onChange={function(e) { updateField('description', e.target.value); }} />
                    ) : (
                      t.description || '\u2014'
                    )}
                  </td>
                  <td className="xeplr-admin-actions-col">
                    <div className="xeplr-admin-action-btns">
                      {isEditing ? (
                        <>
                          <button onClick={handleSave} className="xeplr-admin-btn-save" title="Save">{'\u2713'}</button>
                          <button onClick={cancelEdit} className="xeplr-admin-btn-cancel" title="Cancel">{'\u2715'}</button>
                        </>
                      ) : (
                        <>
                          <button onClick={function() { startEdit(t); }} className="xeplr-admin-btn-edit" title="Edit" disabled={editingItem !== null}>{'\u270E'}</button>
                          <button onClick={function() { if (confirm('Delete this ' + label.toLowerCase() + '?')) handleDelete(t.id); }} className="xeplr-admin-btn-delete" title="Delete" disabled={editingItem !== null}>{'\u2715'}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderUserAssignment(users, tenants, search, handleAssignUser, isUserAssignedTenant, label) {
  var q = search ? search.toLowerCase() : '';
  var filtered = users.filter(function(u) {
    if (!q) return true;
    return (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q));
  });

  return (
    <div className="xeplr-admin-matrix-wrapper">
      <table className="xeplr-admin-matrix" role="grid">
        <thead>
          <tr>
            <th className="xeplr-admin-sticky-col">User</th>
            {tenants.map(function(t) {
              return <th key={t.id} className="xeplr-admin-role-header">{t.name}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={tenants.length + 1} className="xeplr-admin-empty">No users found</td></tr>
          ) : (
            filtered.map(function(u) {
              return (
                <tr key={u.id}>
                  <td className="xeplr-admin-sticky-col" style={{ lineHeight: '1.3' }}>
                    <div className="xeplr-admin-user-name">{u.name || '\u2014'}</div>
                    <div className="xeplr-admin-user-email">{u.email}</div>
                  </td>
                  {tenants.map(function(t) {
                    var assigned = isUserAssignedTenant(u, t.id);
                    return (
                      <td key={t.id} className="xeplr-admin-cell">
                        <label className="xeplr-admin-toggle">
                          <input type="checkbox" checked={assigned} onChange={function() { handleAssignUser(u.id, t.id, assigned); }} />
                          <span className="xeplr-admin-checkmark" />
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
  );
}
