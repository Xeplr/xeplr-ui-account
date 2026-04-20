import { useState } from 'react';
import { registerUser } from './api.js';

export function useRegisterController(options = {}) {
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onSuccess = options.onSuccess || null;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await registerUser(form);
      setSuccess('Registration successful. Please wait, someone will activate you.');
      setForm({ name: '', email: '', phoneNumber: '', password: '' });
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    form,
    error,
    success,
    loading,
    handleChange,
    handleSubmit,
  };
}
