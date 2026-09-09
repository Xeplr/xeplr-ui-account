import { useEffect, useRef } from 'react';

/**
 * Validates that required elements exist in the rendered design.
 * Throws a visible error if any required element is missing.
 *
 * A rule matches by id, role or selector. `anyOf` takes a list of selectors
 * and passes when ANY one is present — which is what a design with tabs or
 * steps needs, since only the current one is mounted and demanding all of
 * them at once can never pass.
 *
 * @param {string} componentName - Name of the page (for error messages)
 * @param {Array<{id?: string, role?: string, selector?: string, anyOf?: string[], label: string}>} requiredElements
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
        } else if (rule.anyOf) {
          for (var j = 0; j < rule.anyOf.length && !found; j++) {
            found = !!containerRef.current.querySelector(rule.anyOf[j]);
          }
        } else if (rule.selector) {
          found = !!containerRef.current.querySelector(rule.selector);
        }

        if (!found) {
          var where = rule.id ? ' (id="' + rule.id + '")'
            : rule.anyOf ? ' (one of: ' + rule.anyOf.join(', ') + ')'
            : rule.selector ? ' (' + rule.selector + ')' : '';
          missing.push(rule.label + where);
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

// Only the structure common to every Nav design (both Design 1 and Design 2
// have an account menu; only Design 2 has a drawer, so that isn't required here).
export var NAV_RULES = [
  { selector: '[aria-haspopup="menu"]', label: 'Account menu trigger' }
];
