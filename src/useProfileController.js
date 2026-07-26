import { useState, useEffect } from 'react';
import { raiseSnackbar } from '@xeplr/ui-utils';
import { getProfile, updateProfile } from './api.js';

export function useProfileController(options = {}) {
  var [form, setForm] = useState({ name: '', email: '', phoneNumber: '' });
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');
  var [loading, setLoading] = useState(false);
  var [fetching, setFetching] = useState(true);

  var onSuccess = options.onSuccess || null;

  useEffect(function() {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setFetching(true);
    try {
      var data = await getProfile();
      setForm({
        name: data.name || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
      });
    } catch (err) {
      setError(err.message);
      raiseSnackbar(err.message, { design: 'error' });
    } finally {
      setFetching(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      var result = await updateProfile(form);
      var message = 'Profile updated successfully';
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
    form,
    error,
    success,
    loading,
    fetching,
    handleChange,
    handleSubmit,
  };
}
