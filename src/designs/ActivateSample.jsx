import { Link } from 'react-router-dom';
import './auth.css';

export default function ActivateSample({ token, error, success, loading }) {
  if (!token) {
    return (
      <div className="xeplr-auth-container">
        <div className="xeplr-auth-alert xeplr-auth-alert-error">Invalid activation link</div>
        <div className="xeplr-auth-links">
          <p><Link to="/auth/register">Register a new account</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="xeplr-auth-container">
      <h1>Account Activation</h1>
      {loading && <div className="xeplr-auth-alert">Activating your account...</div>}
      {error && (
        <>
          <div className="xeplr-auth-alert xeplr-auth-alert-error">{error}</div>
          <div className="xeplr-auth-links">
            <p><Link to="/auth/login">Go to Login</Link></p>
          </div>
        </>
      )}
      {success && (
        <>
          <div className="xeplr-auth-alert xeplr-auth-alert-success">{success}</div>
          <div className="xeplr-auth-links">
            <p><Link to="/auth/login">Go to Login</Link></p>
          </div>
        </>
      )}
    </div>
  );
}
