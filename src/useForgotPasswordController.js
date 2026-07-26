import { useState } from 'react';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { forgotPassword } from './api.js';

export function useForgotPasswordController() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await forgotPassword({ email });
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
    email, setEmail,
    error,
    success,
    loading,
    handleSubmit,
  };
}
