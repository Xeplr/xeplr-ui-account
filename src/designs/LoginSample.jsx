import { Link } from 'react-router-dom';
import './auth.css';

export default function LoginSample({ email, setEmail, password, setPassword, error, loading, handleSubmit }) {
  return (
    <div className="xeplr-auth-container">
      <h1>Login</h1>
      {error && <div className="xeplr-auth-alert xeplr-auth-alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-email">Email</label>
          <input id="xeplr-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-password">Password</label>
          <input id="xeplr-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
      <div className="xeplr-auth-links">
        <p>Don't have an account? <Link to="/auth/register">Register</Link></p>
        <p><Link to="/auth/forgot-password">Forgot Password?</Link></p>
      </div>
    </div>
  );
}
