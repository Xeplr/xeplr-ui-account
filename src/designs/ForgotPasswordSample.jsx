import { Link } from 'react-router-dom';
import './auth.css';

export default function ForgotPasswordSample({ email, setEmail, error, success, loading, handleSubmit }) {
  return (
    <div className="xeplr-auth-container">
      <h1>Forgot Password</h1>
      {error && <div className="xeplr-auth-alert xeplr-auth-alert-error">{error}</div>}
      {success && <div className="xeplr-auth-alert xeplr-auth-alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-email">Email</label>
          <input id="xeplr-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your registered email" />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
      </form>
      <div className="xeplr-auth-links">
        <p><Link to="/auth/login">Back to Login</Link></p>
      </div>
    </div>
  );
}
