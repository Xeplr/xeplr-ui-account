import { Link } from 'react-router-dom';
import './auth.css';

export default function NotActivatedSample() {
  return (
    <div className="xeplr-auth-container">
      <div className="xeplr-auth-not-activated">
        <h1>Activate your account</h1>
        <p className="xeplr-auth-note">Your account is not activated yet. Open the activation link we emailed you when you registered.</p>
      </div>
      <div className="xeplr-auth-links">
        <p>No email? <Link to="/auth/resend-activation">Send the link again</Link></p>
        <p><Link to="/auth/login">Back to Login</Link></p>
      </div>
    </div>
  );
}
