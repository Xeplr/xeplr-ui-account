import { Link } from 'react-router-dom';
import './auth.css';

export default function ResetPasswordSample({ token, password, setPassword, error, success, loading, handleSubmit }) {
  if (!token && !success) {
    return (
      <div className="xeplr-auth-container">
        <div className="xeplr-auth-alert xeplr-auth-alert-error">Invalid reset link</div>
        <div className="xeplr-auth-links">
          <p><Link to="/auth/forgot-password">Request a new reset link</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="xeplr-auth-container">
      <h1>Reset Password</h1>
      {error && <div className="xeplr-auth-alert xeplr-auth-alert-error">{error}</div>}
      {success && (
        <>
          <div className="xeplr-auth-alert xeplr-auth-alert-success">{success}</div>
          <div className="xeplr-auth-links">
            <p><Link to="/auth/login">Go to Login</Link></p>
          </div>
        </>
      )}
      {!success && (
        <form onSubmit={handleSubmit}>
          <div className="xeplr-auth-form-group">
            <label htmlFor="xeplr-password">New Password</label>
            <input id="xeplr-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter new password" />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      )}
      <div className="xeplr-auth-links">
        <p><Link to="/auth/login">Back to Login</Link></p>
      </div>
    </div>
  );
}
