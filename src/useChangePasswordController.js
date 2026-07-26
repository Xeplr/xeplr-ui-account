import { useState } from 'react';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { changePassword } from './api.js';

export function useChangePasswordController(options = {}) {
  var [currentPassword, setCurrentPassword] = useState('');
  var [newPassword, setNewPassword] = useState('');
  var [confirmPassword, setConfirmPassword] = useState('');
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');
  var [loading, setLoading] = useState(false);

  var onSuccess = options.onSuccess || null;

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
      var message = 'Password changed successfully';
      setSuccess(message);
      raiseSnackbar(message, { design: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess(result);
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
