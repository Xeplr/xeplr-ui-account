import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { resetPassword } from './api.js';

export function useResetPasswordController() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const warnedNoToken = useRef(false);

  useEffect(function() {
    if (!token && !warnedNoToken.current) {
      warnedNoToken.current = true;
      raiseSnackbar('Invalid or expired reset link', { design: 'error' });
    }
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await resetPassword({ token, newPassword: password });
      setSuccess(result.message);
      raiseSnackbar(result.message, { design: 'success' });
    } catch (err) {
      setError(err.message);
      raiseSnackbar(err.message, { design: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return {
    token,
    password, setPassword,
    error,
    success,
    loading,
    handleSubmit,
  };
}
