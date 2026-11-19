import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { loginUser, getSignInOptions, requestSignInCode, verifySignInCode, sendSecondStepCode, verifySecondStep } from './api.js';
import { setToken, setRefreshToken, getTrustToken, setTrustToken } from './token.js';
import { useAccess } from './AccessContext.jsx';
import { consumeReturnTo } from './returnTo.js';

// THE WAYS IN, as the server offers them (@xeplr/auth GET /sign-in-options):
//
//   way 'password'  email + password
//   way 'email'     email → a code by email → the code
//   way 'mobile'    mobile number → a code by text → the code
//
// and then, when the server asks one, the SECOND STEP: a code from the
// authenticator app, or by email / text — with "send me a code by email
// instead" always on offer. The way is in the URL (?with=email|mobile), so a
// refresh comes back to it; a half-done second step is not (its ticket is a
// credential, kept in memory only) — a refresh starts the sign-in again.
//
// An older server has no /sign-in-options: then it is the password, as before.

var WAY_METHOD = { password: 'password', email: 'email_otp', mobile: 'phone_otp' };
var DEFAULT_OPTIONS = { methods: ['password'], twoFactor: 'off', twoFactorMethods: [], trustDays: 0 };

export function useLoginController(options = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signInOptions, setSignInOptions] = useState(DEFAULT_OPTIONS);
  const [codeSent, setCodeSent] = useState(false);
  const [secondStep, setSecondStep] = useState(null);
  const [trustDevice, setTrustDevice] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Safe — returns null if no AccessProvider wraps the app
  const accessCtx = useAccess();

  // Default: back to wherever a gate (ProtectedRoute, or an app's own gate)
  // sent the user here from, not always home — see returnTo.js. A caller
  // that supplies its own onSuccess owns navigation entirely; this default
  // only applies when they don't.
  const onSuccess = options.onSuccess || (() => navigate(consumeReturnTo() || '/'));
  const notActivatedPath = options.notActivatedPath || '/auth/not-activated';

  useEffect(function() {
    var live = true;
    getSignInOptions()
      .then(function(o) { if (live && o && Array.isArray(o.methods)) setSignInOptions(o); })
      .catch(function() { /* an older server: the password, as before */ });
    return function() { live = false; };
  }, []);

  const ways = Object.keys(WAY_METHOD).filter(function(w) { return signInOptions.methods.indexOf(WAY_METHOD[w]) !== -1; });
  const asked = searchParams.get('with');
  const way = ways.indexOf(asked) !== -1 ? asked : (ways[0] || 'password');
  // 'first' (email/password, or where to send a code) → 'code' (type it) → 'second'
  const step = secondStep ? 'second' : (way !== 'password' && codeSent ? 'code' : 'first');

  function fail(err) {
    setError(err.message);
    raiseSnackbar(err.message, { design: 'error' });
  }

  function chooseWay(next) {
    setError('');
    setCode('');
    setCodeSent(false);
    setSecondStep(null);
    var params = new URLSearchParams(searchParams);
    if (next === ways[0]) params.delete('with'); else params.set('with', next);
    setSearchParams(params, { replace: true });
  }

  /** Tokens → signed in; { secondStep } → ask it. */
  function finish(result) {
    if (result && result.secondStep) {
      setCode('');
      setTrustDevice(false);
      setSecondStep(result.secondStep);
      return;
    }
    setToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    if (result.trustToken) setTrustToken(result.trustToken);
    if (accessCtx) accessCtx.onLogin(result);
    onSuccess(result);
  }

  async function run(fn) {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      // The code, not the wording. The sentence is the older server's, kept so
      // this page still works against an @xeplr/auth that predates the code.
      if ((err.status === 403 && err.code === 'NOT_ACTIVATED') || err.message === 'Please wait, someone will activate you.') {
        navigate(notActivatedPath);
      } else if (err.code === 'SIGN_IN_EXPIRED') {
        setSecondStep(null);
        setCodeSent(false);
        setCode('');
        fail(err);
      } else {
        fail(err);
      }
    } finally {
      setLoading(false);
    }
  }

  function who() {
    return way === 'mobile' ? { phoneNumber: phoneNumber } : { email: email };
  }

  async function sendCode() {
    await requestSignInCode(who());
    setCodeSent(true);
    raiseSnackbar(way === 'mobile'
      ? 'If this number is verified on an account, a code is on its way.'
      : 'If this address has an account, a code is on its way.', { design: 'success' });
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    await run(async function() {
      if (step === 'second') {
        return finish(await verifySecondStep({ ticket: secondStep.ticket, method: secondStep.method, code: code, trustDevice: trustDevice }));
      }
      if (way === 'password') {
        return finish(await loginUser({ email: email, password: password, trustToken: getTrustToken() }));
      }
      if (step === 'first') return sendCode();
      return finish(await verifySignInCode(Object.assign(who(), { code: code, trustToken: getTrustToken() })));
    });
  }

  /** A new code: the sign-in code again, or the second step's — by `method` ('email' | 'sms'), e.g. "by email instead". */
  async function resendCode(method) {
    await run(async function() {
      if (step === 'second') {
        var chosen = method || secondStep.method;
        var sent = await sendSecondStepCode({ ticket: secondStep.ticket, method: chosen });
        setCode('');
        setSecondStep(Object.assign({}, secondStep, { method: chosen, sentTo: sent.sentTo }));
        raiseSnackbar('A new code is on its way to ' + sent.sentTo + '.', { design: 'success' });
        return;
      }
      setCode('');
      await sendCode();
    });
  }

  /** In the second step: switch to the authenticator app (nothing to send). */
  function switchToAuthenticator() {
    setError('');
    setCode('');
    setSecondStep(Object.assign({}, secondStep, { method: 'authenticator', sentTo: '' }));
  }

  /** Back to the start of the current way. */
  function startOver() {
    setError('');
    setCode('');
    setCodeSent(false);
    setSecondStep(null);
  }

  return {
    email, setEmail,
    password, setPassword,
    phoneNumber, setPhoneNumber,
    code, setCode,
    error,
    loading,
    handleSubmit,
    // the ways in
    ways,
    way,
    chooseWay,
    step,
    resendCode,
    startOver,
    // the second step: { ticket, method, methods, sentTo, trustDays }
    secondStep,
    switchToAuthenticator,
    trustDevice, setTrustDevice,
    signInOptions,
  };
}
