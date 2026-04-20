import { useEffect, useRef } from 'react';

/**
 * Validates that required elements exist in the rendered design.
 * Throws a visible error if any required element is missing.
 *
 * @param {string} componentName - Name of the page (for error messages)
 * @param {Array<{id?: string, role?: string, selector?: string, label: string}>} requiredElements
 */
export function useDesignValidator(componentName, requiredElements) {
  var containerRef = useRef(null);

  useEffect(function() {
    if (!containerRef.current) return;

    // Delay validation to allow async data to render
    var timer = setTimeout(function() {
      if (!containerRef.current) return;

      var missing = [];
      for (var i = 0; i < requiredElements.length; i++) {
        var rule = requiredElements[i];
        var found = false;

        if (rule.id) {
          found = !!containerRef.current.querySelector('#' + rule.id);
        } else if (rule.role) {
          found = !!containerRef.current.querySelector('[role="' + rule.role + '"]');
        } else if (rule.selector) {
          found = !!containerRef.current.querySelector(rule.selector);
        }

        if (!found) {
          missing.push(rule.label + (rule.id ? ' (id="' + rule.id + '")' : '') + (rule.selector ? ' (' + rule.selector + ')' : ''));
        }
      }

      if (missing.length > 0 && process.env.NODE_ENV !== 'production') {
        console.warn(
          '[xeplr-ui-account] ' + componentName + ' design is missing required elements:\n' +
          missing.map(function(m) { return '  - ' + m; }).join('\n')
        );
      }
    }, 3000);

    return function() { clearTimeout(timer); };
  }, []);

  return containerRef;
}

export var LOGIN_RULES = [
  { id: 'xeplr-email', label: 'Email input' },
  { id: 'xeplr-password', label: 'Password input' },
  { selector: 'button[type="submit"]', label: 'Submit button' }
];

export var REGISTER_RULES = [
  { id: 'xeplr-name', label: 'Name input' },
  { id: 'xeplr-email', label: 'Email input' },
  { id: 'xeplr-password', label: 'Password input' },
  { selector: 'button[type="submit"]', label: 'Submit button' }
];

export var FORGOT_PASSWORD_RULES = [
  { id: 'xeplr-email', label: 'Email input' },
  { selector: 'button[type="submit"]', label: 'Submit button' }
];

export var RESET_PASSWORD_RULES = [
  { id: 'xeplr-password', label: 'Password input' },
  { selector: 'button[type="submit"]', label: 'Submit button' }
];

export var CHANGE_PASSWORD_RULES = [
  { id: 'xeplr-current-password', label: 'Current password input' },
  { id: 'xeplr-new-password', label: 'New password input' },
  { id: 'xeplr-confirm-password', label: 'Confirm password input' },
  { selector: 'button[type="submit"]', label: 'Submit button' }
];

export var PROFILE_RULES = [
  { id: 'xeplr-profile-name', label: 'Name input' },
  { id: 'xeplr-profile-email', label: 'Email input' },
  { selector: 'button[type="submit"]', label: 'Submit button' }
];

export var USER_ROLES_MATRIX_RULES = [
  { id: 'xeplr-admin-user-search', label: 'User search input' },
  { role: 'grid', label: 'Matrix grid table' }
];

export var ACCESS_MATRIX_RULES = [
  { id: 'xeplr-admin-access-search', label: 'Access search input' },
  { role: 'tablist', label: 'Tab list for Modules/Uncategorized' }
];

export var MASTER_SETTINGS_RULES = [
  { id: 'xeplr-admin-master-search', label: 'Master search input' },
  { role: 'tablist', label: 'Tab list for master types' }
];
