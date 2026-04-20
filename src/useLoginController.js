import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from './api.js';
import { setToken, setRefreshToken } from './token.js';
import { useAccess } from './AccessContext.jsx';

export function useLoginController(options = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Safe — returns null if no AccessProvider wraps the app
  const accessCtx = useAccess();

  const onSuccess = options.onSuccess || (() => navigate('/'));
  const notActivatedPath = options.notActivatedPath || '/auth/not-activated';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginUser({ email, password });
      setToken(result.accessToken);
      setRefreshToken(result.refreshToken);

      // If AccessProvider is available, use it to store user + access
      if (accessCtx) {
        accessCtx.onLogin(result);
      }

      onSuccess(result);
    } catch (err) {
      if (err.message === 'Please wait, someone will activate you.') {
        navigate(notActivatedPath);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return {
    email, setEmail,
    password, setPassword,
    error,
    loading,
    handleSubmit,
  };
}
