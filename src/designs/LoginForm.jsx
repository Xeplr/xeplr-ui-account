import { useState } from 'react';
import { Link } from 'react-router-dom';
import './login.css';

// The form every LoginDesign shares — the designs differ in layout around it,
// and the field style comes from the design's root class (see login.css).
// Keeps the ids and submit button that LOGIN_RULES requires.
//
// Draws whichever step the controller is on: the way in (password, a code by
// email, a code by text — only the ones the server offers), typing the code,
// and the second step. Everything comes from useLoginController.

var WAY_LABEL = { password: 'Password', email: 'Email code', mobile: 'Mobile' };

var SECOND_TITLE = {
  authenticator: 'Enter the 6-digit code from your authenticator app.',
  email: 'We emailed a code to ',
  sms: 'We texted a code to '
};

export default function LoginForm(props) {
  var step = props.step || 'first';
  var way = props.way || 'password';
  var ways = props.ways || ['password'];

  return (
    <form className="xeplr-login-form" onSubmit={props.handleSubmit}>
      {step !== 'second' && ways.length > 1 && (
        <div className="xeplr-login-ways" role="tablist" aria-label="Sign in with">
          {ways.map(function(w) {
            return (
              <button key={w} type="button" role="tab" aria-selected={w === way}
                className={'xeplr-login-way' + (w === way ? ' xeplr-login-way-on' : '')}
                onClick={function() { props.chooseWay(w); }}>
                {WAY_LABEL[w]}
              </button>
            );
          })}
        </div>
      )}

      {step === 'second' ? <SecondStep {...props} />
        : step === 'code' ? <CodeStep {...props} />
        : way === 'password' ? <PasswordFields {...props} />
        : <WhereToSend {...props} />}

      {step === 'first' && props.links !== false && (
        <p className="xeplr-login-alt">
          New here? <Link to="/auth/register">Create an account</Link>
        </p>
      )}
    </form>
  );
}

function Submit({ loading, label, busy }) {
  return (
    <button type="submit" className="xeplr-login-submit" disabled={loading}>
      {loading ? busy : label}
    </button>
  );
}

function PasswordFields({ email, setEmail, password, setPassword, loading, submitLabel }) {
  var [showPassword, setShowPassword] = useState(false);
  return (
    <>
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
      <Submit loading={loading} label={submitLabel || 'Sign in'} busy="Signing in…" />
    </>
  );
}

function WhereToSend({ way, email, setEmail, phoneNumber, setPhoneNumber, loading }) {
  return (
    <>
      {way === 'mobile' ? (
        <div className="xeplr-login-field">
          <label htmlFor="xeplr-phone">Mobile number</label>
          <input id="xeplr-phone" type="tel" autoComplete="tel" inputMode="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required placeholder="+91 98765 43210" />
          <span className="xeplr-login-note">The number verified on your account, in your profile.</span>
        </div>
      ) : (
        <div className="xeplr-login-field">
          <label htmlFor="xeplr-email">Email</label>
          <input id="xeplr-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" />
        </div>
      )}
      <Submit loading={loading} label="Send me a code" busy="Sending…" />
    </>
  );
}

function CodeInput({ code, setCode }) {
  return (
    <div className="xeplr-login-field">
      <label htmlFor="xeplr-code">Code</label>
      <input id="xeplr-code" className="xeplr-login-code" type="text" inputMode="numeric" autoComplete="one-time-code"
        pattern="[0-9 ]*" maxLength={7} value={code} onChange={e => setCode(e.target.value)} required placeholder="123456" autoFocus />
    </div>
  );
}

function CodeStep(props) {
  var to = props.way === 'mobile' ? props.phoneNumber : props.email;
  return (
    <>
      <p className="xeplr-login-note">If <strong>{to}</strong> belongs to an account, a code is on its way. It works for 5 minutes.</p>
      <CodeInput code={props.code} setCode={props.setCode} />
      <Submit loading={props.loading} label="Sign in" busy="Checking…" />
      <div className="xeplr-login-actions">
        <button type="button" className="xeplr-login-link" disabled={props.loading} onClick={function() { props.resendCode(); }}>Send a new code</button>
        <button type="button" className="xeplr-login-link" onClick={props.startOver}>{props.way === 'mobile' ? 'Change number' : 'Change email'}</button>
      </div>
    </>
  );
}

function SecondStep(props) {
  var s = props.secondStep;
  var has = function(m) { return s.methods.indexOf(m) !== -1 && s.method !== m; };
  return (
    <>
      <p className="xeplr-login-note">
        <strong>One more step.</strong>{' '}
        {SECOND_TITLE[s.method]}{s.method !== 'authenticator' && <strong>{s.sentTo}</strong>}{s.method !== 'authenticator' && '.'}
      </p>
      <CodeInput code={props.code} setCode={props.setCode} />
      {s.trustDays > 0 && (
        <label className="xeplr-login-check">
          <input type="checkbox" checked={props.trustDevice} onChange={e => props.setTrustDevice(e.target.checked)} />
          Don't ask again on this device for {s.trustDays} days
        </label>
      )}
      <Submit loading={props.loading} label="Verify" busy="Checking…" />
      <div className="xeplr-login-actions">
        {s.method !== 'authenticator' && (
          <button type="button" className="xeplr-login-link" disabled={props.loading} onClick={function() { props.resendCode(s.method); }}>Send a new code</button>
        )}
        {has('email') && (
          <button type="button" className="xeplr-login-link" disabled={props.loading} onClick={function() { props.resendCode('email'); }}>Email me a code instead</button>
        )}
        {has('sms') && (
          <button type="button" className="xeplr-login-link" disabled={props.loading} onClick={function() { props.resendCode('sms'); }}>Text me a code instead</button>
        )}
        {has('authenticator') && (
          <button type="button" className="xeplr-login-link" onClick={props.switchToAuthenticator}>Use my authenticator app</button>
        )}
        <button type="button" className="xeplr-login-link" onClick={props.startOver}>Start again</button>
      </div>
    </>
  );
}
