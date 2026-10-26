import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { changePassword, logoutUser } from './api.js';
import { useAccess } from './AccessContext.jsx';
import { markDeliberateSignOut } from './returnTo.js';

export function useChangePasswordController(options = {}) {
  var [currentPassword, setCurrentPassword] = useState('');
  var [newPassword, setNewPassword] = useState('');
  var [confirmPassword, setConfirmPassword] = useState('');
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');
  var [loading, setLoading] = useState(false);

  var onSuccess = options.onSuccess || null;
  var loginPath = options.loginPath || '/auth/login';
  var navigate = useNavigate();
  var accessCtx = useAccess();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      var mismatchMessage = 'Passwords do not match';
      setError(mismatchMessage);
      raiseSnackbar(mismatchMessage, { design: 'error' });
      return;
    }

    setLoading(true);
    try {
      var result = await changePassword({ currentPassword, newPassword });
      var message = 'Password changed. Sign in again with your new password.';
      setSuccess(message);
      raiseSnackbar(message, { design: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // The server has ended every session, this one included. Signing out
      // now says so; staying "signed in" would end in a surprise logout on
      // the next request. Deliberate, so the next sign-in goes home rather
      // than back to this form (see returnTo.js).
      markDeliberateSignOut();
      if (accessCtx) accessCtx.logout(); else logoutUser();
      if (onSuccess) onSuccess(result);
      else navigate(loginPath);
    } catch (err) {
      setError(err.message);
      raiseSnackbar(err.message, { design: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return {
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    error,
    success,
    loading,
    handleSubmit,
  };
}
