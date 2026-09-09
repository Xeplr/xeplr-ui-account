import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { activateAccount } from './api.js';

export function useActivateController() {
  var [searchParams] = useSearchParams();
  var token = searchParams.get('token');
  // Put there by @xeplr/auth's register() when the registration was one step
  // of a workflow. Handed back untouched so the server can release the step
  // that was waiting — this page never interprets it.
  var workflowKey = searchParams.get('workflowKey');
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
    activateAccount(token, workflowKey)
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
  }, [token, workflowKey]);

  return {
    token,
    error,
    success,
    loading,
  };
}
