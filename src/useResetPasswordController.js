import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resetPassword } from './api.js';

export function useResetPasswordController() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await resetPassword({ token, newPassword: password });
      setSuccess(result.message);
    } catch (err) {
      setError(err.message);
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
