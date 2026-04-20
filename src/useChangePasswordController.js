import { useState } from 'react';
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
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      var result = await changePassword({ currentPassword, newPassword });
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err.message);
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
