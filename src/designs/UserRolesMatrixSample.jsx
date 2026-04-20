import './admin.css';

export default function UserRolesMatrixSample({
  users, roles, search, setSearch, loading, error, saving, handleToggle, isAssigned, reload
}) {
  return (
    <div className="xeplr-admin-container">
      <div className="xeplr-admin-header">
        <h2>User Roles</h2>
        <div className="xeplr-admin-toolbar">
          <input
            id="xeplr-admin-user-search"
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            className="xeplr-admin-search"
          />
          <button type="button" onClick={reload} className="xeplr-admin-btn-secondary">Refresh</button>
        </div>
      </div>

      {error && <div className="xeplr-admin-alert xeplr-admin-alert-error">{error}</div>}

      {loading ? (
        <div className="xeplr-admin-loading">Loading...</div>
      ) : (
        <div className="xeplr-admin-matrix-wrapper">
          <table className="xeplr-admin-matrix" role="grid">
            <thead>
              <tr>
                <th className="xeplr-admin-sticky-col">User</th>
                {roles.map(function(role) {
                  return <th key={role.id} className="xeplr-admin-role-header">{role.name}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={roles.length + 1} className="xeplr-admin-empty">No users found</td></tr>
              ) : (
                users.map(function(user) {
                  return (
                    <tr key={user.id}>
                      <td className="xeplr-admin-sticky-col xeplr-admin-user-cell">
                        <div className="xeplr-admin-user-name">{user.name || '—'}</div>
                        <div className="xeplr-admin-user-email">{user.email}</div>
                      </td>
                      {roles.map(function(role) {
                        var assigned = isAssigned(user, role.id);
                        var key = user.id + ':' + role.id;
                        var isSaving = !!saving[key];
                        return (
                          <td key={role.id} className="xeplr-admin-cell">
                            <label className="xeplr-admin-toggle">
                              <input
                                type="checkbox"
                                checked={assigned}
                                disabled={isSaving}
                                onChange={function() { handleToggle(user.id, role.id, assigned); }}
                              />
                              <span className={'xeplr-admin-checkmark' + (isSaving ? ' xeplr-admin-saving' : '')} />
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
      )}
    </div>
  );
}
