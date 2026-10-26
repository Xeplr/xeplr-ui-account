import { useState } from 'react';
import { Link } from 'react-router-dom';
import './login.css';

// The form every LoginDesign shares — the designs differ in layout around it,
// and the field style comes from the design's root class (see login.css).
// Keeps the ids and submit button that LOGIN_RULES requires.
export default function LoginForm({ email, setEmail, password, setPassword, loading, handleSubmit, submitLabel, links }) {
  var [showPassword, setShowPassword] = useState(false);

  return (
    <form className="xeplr-login-form" onSubmit={handleSubmit}>
      <div className="xeplr-login-field">
        <label htmlFor="xeplr-email">Email</label>
        <input id="xeplr-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" />
      </div>
      <div className="xeplr-login-field">
        <div className="xeplr-login-field-head">
          <label htmlFor="xeplr-password">Password</label>
          <Link className="xeplr-login-forgot" to="/auth/forgot-password">Forgot password?</Link>
        </div>
        <div className="xeplr-login-password">
          <input id="xeplr-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your password" />
          <button type="button" className="xeplr-login-reveal" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <button type="submit" className="xeplr-login-submit" disabled={loading}>
        {loading ? 'Signing in…' : (submitLabel || 'Sign in')}
      </button>
      {links !== false && (
        <p className="xeplr-login-alt">
          New here? <Link to="/auth/register">Create an account</Link>
        </p>
      )}
    </form>
  );
}
