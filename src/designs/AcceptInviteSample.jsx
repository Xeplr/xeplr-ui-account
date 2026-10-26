import { Link } from 'react-router-dom';
import './auth.css';

// error/success feedback fires as a snackbar (see useAcceptInviteController.js);
// this design switches between checking the link, the form, and done.
export default function AcceptInviteSample({
  invitee, name, setName, password, setPassword, confirmPassword, setConfirmPassword,
  error, success, checking, loading, handleSubmit
}) {
  if (checking) {
    return (
      <div className="xeplr-auth-container">
        <div className="xeplr-auth-alert">Checking your invite...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="xeplr-auth-container">
        <h1>You're in</h1>
        <p className="xeplr-auth-note">{success}</p>
        <div className="xeplr-auth-links">
          <p><Link to="/auth/login">Go to Login</Link></p>
        </div>
      </div>
    );
  }

  if (!invitee) {
    return (
      <div className="xeplr-auth-container">
        <h1>Invite not valid</h1>
        <p className="xeplr-auth-note">{error || 'This invite link is not valid.'} Ask the person who invited you to send a new invite.</p>
        <div className="xeplr-auth-links">
          <p><Link to="/auth/login">Go to Login</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="xeplr-auth-container">
      <h1>Accept your invite</h1>
      <p className="xeplr-auth-note">Set a password for {invitee.email} to finish creating your account.</p>
      <form onSubmit={handleSubmit}>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-name">Name</label>
          <input id="xeplr-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-password">Password</label>
          <input id="xeplr-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Choose a password" />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-confirm-password">Confirm password</label>
          <input id="xeplr-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Type it again" />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Accept invite'}</button>
      </form>
    </div>
  );
}
