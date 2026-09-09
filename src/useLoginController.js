import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { loginUser } from './api.js';
import { setToken, setRefreshToken } from './token.js';
import { useAccess } from './AccessContext.jsx';
import { consumeReturnTo } from './returnTo.js';

export function useLoginController(options = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Safe — returns null if no AccessProvider wraps the app
  const accessCtx = useAccess();

  // Default: back to wherever a gate (ProtectedRoute, or an app's own gate)
  // sent the user here from, not always home — see returnTo.js. A caller
  // that supplies its own onSuccess owns navigation entirely; this default
  // only applies when they don't.
  const onSuccess = options.onSuccess || (() => navigate(consumeReturnTo() || '/'));
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
        raiseSnackbar(err.message, { design: 'error' });
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
