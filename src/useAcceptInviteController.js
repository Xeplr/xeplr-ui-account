import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { previewInvite, acceptInvite } from './api.js';

// The page an invite email links to (/auth/accept-invite?token=…): shows who
// the invite is for, then sets their name and password, which also activates
// the account.
export function useAcceptInviteController(options = {}) {
  var [searchParams] = useSearchParams();
  var token = searchParams.get('token');
  var [invitee, setInvitee] = useState(null);
  var [name, setName] = useState('');
  var [password, setPassword] = useState('');
  var [confirmPassword, setConfirmPassword] = useState('');
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');
  var [checking, setChecking] = useState(!!token);
  var [loading, setLoading] = useState(false);
  var called = useRef(false);

  var onSuccess = options.onSuccess || null;

  useEffect(function() {
    if (called.current) return;
    called.current = true;
    if (!token) {
      setError('This invite link is incomplete. Open it again from the invite email.');
      return;
    }
    previewInvite(token)
      .then(function(info) {
        setInvitee(info);
        setName(info.name || '');
      })
      .catch(function(err) {
        setError(err.message);
        raiseSnackbar(err.message, { design: 'error' });
      })
      .finally(function() { setChecking(false); });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      var mismatch = 'Passwords do not match';
      setError(mismatch);
      raiseSnackbar(mismatch, { design: 'error' });
      return;
    }
    setLoading(true);
    try {
      var result = await acceptInvite({ token, name, password });
      var message = 'Invite accepted. Sign in with your new password.';
      setSuccess(message);
      raiseSnackbar(message, { design: 'success' });
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err.message);
      raiseSnackbar(err.message, { design: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return {
    token,
    invitee,
    name, setName,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    error,
    success,
    checking,
    loading,
    handleSubmit,
  };
}
