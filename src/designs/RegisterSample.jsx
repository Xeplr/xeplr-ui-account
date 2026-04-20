import { Link } from 'react-router-dom';
import './auth.css';

export default function RegisterSample({ form, error, success, loading, handleChange, handleSubmit }) {
  return (
    <div className="xeplr-auth-container">
      <h1>Register</h1>
      {error && <div className="xeplr-auth-alert xeplr-auth-alert-error">{error}</div>}
      {success && <div className="xeplr-auth-alert xeplr-auth-alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-name">Name</label>
          <input id="xeplr-name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Enter your name" />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-email">Email</label>
          <input id="xeplr-email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="Enter your email" />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-phone">Phone Number</label>
          <input id="xeplr-phone" name="phoneNumber" type="text" value={form.phoneNumber} onChange={handleChange} placeholder="Enter your phone number" />
        </div>
        <div className="xeplr-auth-form-group">
          <label htmlFor="xeplr-password">Password</label>
          <input id="xeplr-password" name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Enter your password" />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
      </form>
      <div className="xeplr-auth-links">
        <p>Already have an account? <Link to="/auth/login">Login</Link></p>
      </div>
    </div>
  );
}
