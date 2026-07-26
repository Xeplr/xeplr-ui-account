import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { activateAccount } from './api.js';

export function useActivateController() {
  var [searchParams] = useSearchParams();
  var token = searchParams.get('token');
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');
  var [loading, setLoading] = useState(false);
  var called = useRef(false);

  useEffect(function() {
    if (!token) {
      if (!called.current) {
        called.current = true;
        raiseSnackbar('Invalid activation link', { design: 'error' });
      }
      return;
    }
    if (called.current) return;
    called.current = true;
    setLoading(true);
    setError('');
    setSuccess('');
    activateAccount(token)
      .then(function(result) {
        var message = result.message || 'Account activated successfully';
        setSuccess(message);
        raiseSnackbar(message, { design: 'success' });
      })
      .catch(function(err) {
        setError(err.message);
        raiseSnackbar(err.message, { design: 'error' });
      })
      .finally(function() {
        setLoading(false);
      });
  }, [token]);

  return {
    token,
    error,
    success,
    loading,
  };
}
