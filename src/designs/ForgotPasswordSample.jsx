import { Link } from 'react-router-dom';
import './auth.css';

// error/success feedback fires as a snackbar (see useForgotPasswordController.js)
// — this design doesn't render it inline.
export default function ForgotPasswordSample({ email, setEmail, loading, handleSubmit }) {
  return (
    <div className="xeplr-auth-container">
      <h1>Forgot Password</h1>
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
