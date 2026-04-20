import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { activateAccount } from './api.js';

export function useActivateController() {
  var [searchParams] = useSearchParams();
  var token = searchParams.get('token');
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');
  var [loading, setLoading] = useState(false);
  var called = useRef(false);

  useEffect(function() {
    if (!token || called.current) return;
    called.current = true;
    setLoading(true);
    setError('');
    setSuccess('');
    activateAccount(token)
      .then(function(result) {
        setSuccess(result.message || 'Account activated successfully');
      })
      .catch(function(err) {
        setError(err.message);
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
