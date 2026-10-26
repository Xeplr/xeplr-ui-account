import { Link } from 'react-router-dom';
import './auth.css';

// error/success feedback fires as a snackbar (see useResendActivationController.js).
export default function ResendActivationSample({ email, setEmail, success, loading, handleSubmit }) {
  return (
    <div className="xeplr-auth-container">
      <h1>Send the activation link again</h1>
      <p className="xeplr-auth-note">
        {success || 'Enter the email you registered with and we will send a new activation link. The old link stops working.'}
      </p>
      <form onSubmit={handleSubmit}>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-email">Email</label>
          <input id="xeplr-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send link'}</button>
      </form>
      <div className="xeplr-auth-links">
        <p><Link to="/auth/login">Back to Login</Link></p>
      </div>
    </div>
  );
}
