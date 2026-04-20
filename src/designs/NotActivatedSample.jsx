import { Link } from 'react-router-dom';
import './auth.css';

export default function NotActivatedSample() {
  return (
    <div className="xeplr-auth-container">
      <div className="xeplr-auth-not-activated">
        <h1>Account Pending Activation</h1>
        <p className="xeplr-auth-message">Please wait, someone will activate you.</p>
        <p>Your account has been created but is not yet activated. An administrator will review and activate your account shortly.</p>
      </div>
      <div className="xeplr-auth-links">
        <p><Link to="/auth/login">Back to Login</Link></p>
      </div>
    </div>
  );
}
