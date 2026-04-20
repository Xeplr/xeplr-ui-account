import './auth.css';

export default function TenantPickerSample({ tenants, loading, error, label, handleSelect, onLogout }) {
  return (
    <div className="xeplr-auth-container">
      <h1>Select {label}</h1>
      {error && <div className="xeplr-auth-alert xeplr-auth-alert-error">{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : tenants.length === 0 ? (
        <div className="xeplr-auth-alert xeplr-auth-alert-error">
          No {label.toLowerCase()}s available. Contact your administrator.
        </div>
      ) : (
        <div className="xeplr-tenant-picker">
          {tenants.map(function(t) {
            return (
              <button
                key={t.id}
                type="button"
                className="xeplr-tenant-option"
                onClick={function() { handleSelect(t); }}
              >
                <span className="xeplr-tenant-name">{t.name}</span>
                {t.code && <span className="xeplr-tenant-code">{t.code}</span>}
                {t.description && <span className="xeplr-tenant-desc">{t.description}</span>}
              </button>
            );
          })}
        </div>
      )}
      {onLogout && (
        <div className="xeplr-auth-links">
          <p><button type="button" onClick={onLogout} style={{ background: 'none', border: 'none', color: 'var(--xeplr-text-muted, #777)', cursor: 'pointer', fontSize: '14px' }}>Sign out</button></p>
        </div>
      )}
    </div>
  );
}
