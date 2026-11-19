import './auth.css';

// Sign-in security, under the profile: the second step and the mobile number.
// Everything comes from useSignInSecurityController; feedback is a snackbar.
// The root keeps id="xeplr-security" (SECURITY_RULES) even when the server
// offers nothing here, so a custom design is checked the same way.

var METHOD_LABEL = { authenticator: 'Authenticator app', email: 'A code by email', sms: 'A code by text message' };
var METHOD_HINT = {
  authenticator: 'Google Authenticator, Microsoft Authenticator, 1Password … No phone signal needed.',
  email: 'Sent to your email address each time you sign in.',
  sms: 'Sent to your verified mobile number.'
};

function QrCode({ matrix }) {
  var n = matrix.length;
  var cells = [];
  matrix.forEach(function(row, r) {
    row.forEach(function(dark, c) { if (dark) cells.push(<rect key={r + '-' + c} x={c} y={r} width="1" height="1" />); });
  });
  return (
    <svg className="xeplr-security-qr" viewBox={'-2 -2 ' + (n + 4) + ' ' + (n + 4)} role="img" aria-label="QR code for your authenticator app" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <g fill="#000">{cells}</g>
    </svg>
  );
}

function Setup(props) {
  var s = props.setup;
  return (
    <form className="xeplr-security-setup" onSubmit={props.confirmSetup}>
      <p className="xeplr-security-text">1. In your authenticator app, add an account and scan this code.</p>
      <QrCode matrix={s.matrix} />
      <p className="xeplr-security-text">Cannot scan? Type this key instead:</p>
      <code className="xeplr-security-secret">{s.grouped}</code>
      <div className="xeplr-auth-form-group">
        <label htmlFor="xeplr-security-setup-code">2. Type the 6-digit code the app shows</label>
        <input id="xeplr-security-setup-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7}
          value={props.setupCode} onChange={function(e) { props.setSetupCode(e.target.value); }} required placeholder="123456" />
      </div>
      <div className="xeplr-security-row">
        <button type="submit" disabled={props.busy === 'confirm'}>{props.busy === 'confirm' ? 'Checking…' : 'Turn on'}</button>
        <button type="button" className="xeplr-security-plain" onClick={props.cancelSetup}>Cancel</button>
      </div>
    </form>
  );
}

function TwoFactor(props) {
  var st = props.status;
  var current = st.method;
  var options = st.methods.slice();
  return (
    <div className="xeplr-security-block">
      <h2>Two-step sign-in</h2>
      <p className="xeplr-security-text">
        {st.mode === 'required'
          ? 'Required here: after your password, you also enter a code.'
          : 'After your password, also ask for a code — so a stolen password alone is not enough.'}
      </p>
      <div className="xeplr-security-choices" role="radiogroup" aria-label="Second step">
        {st.mode === 'optional' && (
          <label className="xeplr-security-choice">
            <input type="radio" name="xeplr-security-method" checked={!current} disabled={!!props.busy}
              onChange={function() { props.choose(null); }} />
            <span><strong>Off</strong><small>Just your password.</small></span>
          </label>
        )}
        {options.map(function(m) {
          var ready = m === 'authenticator' ? st.authenticator : m === 'sms' ? st.phoneVerified : true;
          var on = current === m || (st.mode === 'required' && !current && m === 'email');
          return (
            <label key={m} className={'xeplr-security-choice' + (ready ? '' : ' xeplr-security-choice-off')}>
              <input type="radio" name="xeplr-security-method" checked={on} disabled={!ready || !!props.busy}
                onChange={function() { props.choose(m); }} />
              <span>
                <strong>{METHOD_LABEL[m]}</strong>
                <small>{ready ? METHOD_HINT[m] : (m === 'sms' ? 'Verify your mobile number below first.' : 'Set it up first.')}</small>
              </span>
            </label>
          );
        })}
      </div>
      {st.methods.indexOf('authenticator') !== -1 && !props.setup && (
        <button type="button" className="xeplr-security-plain" disabled={props.busy === 'setup'} onClick={props.startSetup}>
          {st.authenticator ? 'Set up the app again (new phone)' : 'Set up an authenticator app'}
        </button>
      )}
      {props.setup && <Setup {...props} />}
      <p className="xeplr-security-text xeplr-security-small">Lost your phone? At sign-in, choose “Email me a code instead”.</p>
    </div>
  );
}

function Phone(props) {
  var st = props.status;
  var verified = st.phoneVerified && props.phone === st.phoneNumber;
  return (
    <div className="xeplr-security-block">
      <h2>Mobile number</h2>
      <p className="xeplr-security-text">
        {verified ? <>Verified ✓ — you can {st.signIn.indexOf('phone_otp') !== -1 ? 'sign in with it' : 'get codes on it'}.</> : 'Verify your number with a code to use it for signing in.'}
      </p>
      <form className="xeplr-security-row" onSubmit={props.sendPhoneCode}>
        <input id="xeplr-security-phone" className="xeplr-security-input" type="tel" inputMode="tel" autoComplete="tel" aria-label="Mobile number"
          value={props.phone} onChange={function(e) { props.setPhone(e.target.value); }} required placeholder="+91 98765 43210" />
        {!verified && <button type="submit" disabled={props.busy === 'phone'}>{props.busy === 'phone' ? 'Sending…' : (props.phoneSent ? 'Send again' : 'Send code')}</button>}
      </form>
      {props.phoneSent && (
        <form className="xeplr-security-row" onSubmit={props.verifyPhone}>
          <input id="xeplr-security-phone-code" className="xeplr-security-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7} aria-label="Code"
            value={props.phoneCode} onChange={function(e) { props.setPhoneCode(e.target.value); }} required placeholder="123456" />
          <button type="submit" disabled={props.busy === 'verify'}>{props.busy === 'verify' ? 'Checking…' : 'Verify'}</button>
        </form>
      )}
    </div>
  );
}

export default function SignInSecuritySample(props) {
  var show = props.available && (props.twoFactorOn || props.phoneUsed);
  return (
    <section id="xeplr-security" className={show ? 'xeplr-auth-container xeplr-security' : 'xeplr-security-none'} hidden={!show}>
      {show && props.twoFactorOn && <TwoFactor {...props} />}
      {show && props.phoneUsed && <Phone {...props} />}
    </section>
  );
}
