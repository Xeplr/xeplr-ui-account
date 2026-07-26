import { Link } from 'react-router-dom';
import './auth.css';

// error/success feedback fires as a snackbar (see useActivateController.js,
// including the "invalid link" case) — this design doesn't render it inline,
// it just switches which block is visible. `loading`'s in-progress status
// text stays inline (it's ongoing state, not a transient notification).
export default function ActivateSample({ token, error, success, loading }) {
  if (!token) {
    return (
      <div className="xeplr-auth-container">
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
      {(error || success) && (
        <div className="xeplr-auth-links">
          <p><Link to="/auth/login">Go to Login</Link></p>
        </div>
      )}
    </div>
  );
}
