import LoginForm from './LoginForm.jsx';
import './auth.css';

// The plain sample: a heading and the shared sign-in form, which draws every
// step (password, a code by email or text, the second step).
// error/success feedback fires as a snackbar (see useLoginController.js) —
// this design doesn't render it inline.
export default function LoginSample(props) {
  return (
    <div className="xeplr-auth-container">
      <h1>Login</h1>
      <LoginForm {...props} />
    </div>
  );
}
