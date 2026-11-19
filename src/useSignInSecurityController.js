import { useState, useEffect, useCallback } from 'react';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { getTwoFactor, startAuthenticator, confirmAuthenticator, chooseTwoFactorMethod, requestPhoneCode, verifyPhoneCode } from './api.js';
import { qrMatrix, groupSecret } from './qrCode.js';

/**
 * MY SIGN-IN SECURITY: the second step (authenticator app, email or text) and
 * the mobile number that signs in or receives codes. What is offered is the
 * server's (@xeplr/auth AUTH_2FA, AUTH_2FA_METHODS, AUTH_LOGIN_METHODS); an
 * older server without GET /two-factor shows nothing (`available: false`).
 *
 * options.issuer — the name the authenticator app lists this account under;
 * the page's title when not given.
 */
export function useSignInSecurityController(options = {}) {
  var [status, setStatus] = useState(null);
  var [fetching, setFetching] = useState(true);
  var [busy, setBusy] = useState('');
  var [error, setError] = useState('');
  var [setup, setSetup] = useState(null);
  var [setupCode, setSetupCode] = useState('');
  var [phone, setPhone] = useState('');
  var [phoneCode, setPhoneCode] = useState('');
  var [phoneSent, setPhoneSent] = useState(false);

  var issuer = options.issuer || (typeof document !== 'undefined' && document.title) || 'Xeplr';

  var take = useCallback(function(next) {
    setStatus(next);
    setPhone(next && next.phoneNumber ? next.phoneNumber : '');
  }, []);

  useEffect(function() {
    var live = true;
    getTwoFactor()
      .then(function(s) { if (live) take(s); })
      .catch(function() { if (live) setStatus(null); })
      .finally(function() { if (live) setFetching(false); });
    return function() { live = false; };
  }, [take]);

  async function act(key, fn, done) {
    setBusy(key);
    setError('');
    try {
      await fn();
      if (done) raiseSnackbar(done, { design: 'success' });
    } catch (err) {
      setError(err.message);
      raiseSnackbar(err.message, { design: 'error' });
    } finally {
      setBusy('');
    }
  }

  function startSetup() {
    return act('setup', async function() {
      var s = await startAuthenticator({ issuer: issuer });
      setSetupCode('');
      setSetup({ secret: s.secret, grouped: groupSecret(s.secret), otpauthUrl: s.otpauthUrl, matrix: qrMatrix(s.otpauthUrl) });
    });
  }

  function confirmSetup(e) {
    if (e && e.preventDefault) e.preventDefault();
    return act('confirm', async function() {
      take(await confirmAuthenticator({ code: setupCode }));
      setSetup(null);
      setSetupCode('');
    }, 'Authenticator app set up. It is your second step now.');
  }

  function cancelSetup() {
    setSetup(null);
    setSetupCode('');
  }

  /** 'authenticator' | 'email' | 'sms', or null to turn the second step off. */
  function choose(method) {
    return act('method', async function() {
      take(await chooseTwoFactorMethod({ method: method }));
    }, method ? 'Saved.' : 'Two-step sign-in is off.');
  }

  function sendPhoneCode(e) {
    if (e && e.preventDefault) e.preventDefault();
    return act('phone', async function() {
      await requestPhoneCode({ phoneNumber: phone });
      setPhoneSent(true);
      setPhoneCode('');
    }, 'A code is on its way to ' + phone + '.');
  }

  function verifyPhone(e) {
    if (e && e.preventDefault) e.preventDefault();
    return act('verify', async function() {
      await verifyPhoneCode({ code: phoneCode });
      setPhoneSent(false);
      setPhoneCode('');
      take(await getTwoFactor());
    }, 'Mobile number verified.');
  }

  var twoFactorOn = Boolean(status && status.mode !== 'off');
  var phoneUsed = Boolean(status && ((status.signIn || []).indexOf('phone_otp') !== -1 ||
    (twoFactorOn && status.methods.indexOf('sms') !== -1)));

  return {
    available: Boolean(status),
    fetching,
    status,
    twoFactorOn,
    phoneUsed,
    busy,
    error,
    setup, setupCode, setSetupCode, startSetup, confirmSetup, cancelSetup,
    choose,
    phone, setPhone, phoneCode, setPhoneCode, phoneSent, sendPhoneCode, verifyPhone,
  };
}
