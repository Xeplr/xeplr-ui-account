import { useState } from 'react';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { resendActivation } from './api.js';

export function useResendActivationController(options = {}) {
  var [email, setEmail] = useState('');
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');
  var [loading, setLoading] = useState(false);

  var onSuccess = options.onSuccess || null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      var result = await resendActivation({ email });
      // The server answers alike for any address, so this cannot say more.
      var message = result.message || 'If that account is waiting for activation, a new link has been sent.';
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
    email, setEmail,
    error,
    success,
    loading,
    handleSubmit,
  };
}
