import { useState, useEffect } from 'react';
import { getMyTenants, logoutUser } from './api.js';
import { clearAuth } from './token.js';

var STORAGE_KEY = 'xeplr:activeTenant';
var COUNT_KEY = 'xeplr:tenantCount';

/**
 * Get the currently selected tenant from localStorage.
 */
export function getActiveTenant() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Set the active tenant in localStorage.
 */
export function setActiveTenant(tenant) {
  if (tenant) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenant));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Clear the active tenant (on logout).
 */
export function clearActiveTenant() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(COUNT_KEY);
}

/**
 * Check if the user has multiple tenants (show switch option).
 */
export function hasMultipleTenants() {
  try {
    return parseInt(localStorage.getItem(COUNT_KEY) || '0') > 1;
  } catch (e) {
    return false;
  }
}

/**
 * Controller for the tenant picker screen shown after login.
 */
export function useTenantPickerController(options = {}) {
  var [tenants, setTenants] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var level = options.level || 1;
  var label = options.label || 'Company';

  useEffect(function() {
    setLoading(true);
    getMyTenants()
      .then(function(data) {
        setTenants(data);
        try { localStorage.setItem(COUNT_KEY, String(data.length)); } catch(e) {}
        // Auto-select if only one tenant
        if (data.length === 1) {
          setActiveTenant(data[0]);
          if (options.onSelect) options.onSelect(data[0]);
        }
      })
      .catch(function(err) { setError(err.message); })
      .finally(function() { setLoading(false); });
  }, [level]);

  function handleSelect(tenant) {
    setActiveTenant(tenant);
    if (options.onSelect) options.onSelect(tenant);
  }

  function handleLogout() {
    clearActiveTenant();
    logoutUser();
    clearAuth();
    if (options.onLogout) options.onLogout();
    else window.location.href = '/login';
  }

  return {
    tenants,
    loading,
    error,
    label,
    handleSelect,
    onLogout: handleLogout
  };
}
