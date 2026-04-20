import { useState } from 'react';
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
    } catch (err) {
      setError(err.message);
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
