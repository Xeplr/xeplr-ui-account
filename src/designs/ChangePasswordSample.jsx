import './auth.css';

export default function ChangePasswordSample({
  currentPassword, setCurrentPassword,
  newPassword, setNewPassword,
  confirmPassword, setConfirmPassword,
  error, success, loading, handleSubmit
}) {
  return (
    <div className="xeplr-auth-container">
      <h1>Change Password</h1>
      {error && <div className="xeplr-auth-alert xeplr-auth-alert-error">{error}</div>}
      {success && <div className="xeplr-auth-alert xeplr-auth-alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-current-password">Current Password</label>
          <input id="xeplr-current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required placeholder="Enter current password" />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-new-password">New Password</label>
          <input id="xeplr-new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Enter new password" />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-confirm-password">Confirm New Password</label>
          <input id="xeplr-confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm new password" />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Changing...' : 'Change Password'}</button>
      </form>
    </div>
  );
}
