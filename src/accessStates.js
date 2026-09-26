/**
 * Access states — model layer for the Access Matrix's three-way cells.
 * Pure logic, no React dependency.
 *
 * A module + action (e.g. reports / view) is, for whoever it applies to:
 *
 *   enabled    shown and usable
 *   disabled   shown, greyed out, not usable — the API refuses it too
 *   hidden     not shown — the API refuses it
 *
 * They apply at three levels. ROLES are the defaults. A WORKSPACE or a USER
 * can override them, and an override may also be `inherit`: no override,
 * the roles decide.
 */

export var STATES = ['enabled', 'disabled', 'hidden'];
export var OVERRIDE_STATES = ['inherit', 'enabled', 'disabled', 'hidden'];

export var STATE_LABELS = {
  inherit: 'Inherit',
  enabled: 'Enabled',
  disabled: 'Disabled',
  hidden: 'Hidden',
  partial: 'Mixed'
};

export var SCOPES = ['role', 'workspace', 'user'];

/** The map key one stored state lives under. roleId only for scope 'role'. */
export function stateKey(module, action, roleId) {
  return module + ':' + action + (roleId ? ':' + roleId : '');
}

/**
 * Stored states, as the server sends them, into a lookup:
 *   [{ module, action, roleId?, state }]  →  { 'reports:view:r1': 'disabled' }
 * Rows with an unknown state are dropped: a value the UI cannot show must not
 * be shown as something else.
 */
export function indexStates(rows) {
  var out = {};
  (rows || []).forEach(function(r) {
    if (!r || !r.module || !r.action) return;
    if (STATES.indexOf(r.state) === -1) return;
    out[stateKey(r.module, r.action, r.roleId)] = r.state;
  });
  return out;
}

/**
 * What a ROLE cell shows.
 *
 * The role's grant decides visibility: every item of the module/action mapped
 * to the role is `enabled`, none is `hidden`, some is `partial` (a mixed grant,
 * shown as-is so nobody reads it as a clean answer). A stored `disabled` turns
 * a granted cell into `disabled` — shown, but not usable.
 *
 * @param grant   'all' | 'partial' | 'none'  (from the role mappings)
 * @param stored  the stored state for this role, or undefined
 */
export function roleCellState(grant, stored) {
  if (grant === 'none') return 'hidden';
  if (stored === 'disabled') return grant === 'all' ? 'disabled' : 'partial';
  if (grant === 'all') return 'enabled';
  return 'partial';
}

/** What a WORKSPACE or USER cell shows: its override, else inherit. */
export function overrideCellState(stored) {
  return STATES.indexOf(stored) === -1 ? 'inherit' : stored;
}

/**
 * The server calls a role-cell change needs, in order.
 *
 * Visibility is the role mapping (today's module-role endpoint); `disabled` is
 * a stored state on top of it. So:
 *   enabled   → grant, and clear any stored state
 *   disabled  → grant, and store 'disabled'
 *   hidden    → revoke, and clear any stored state
 *
 * @returns [{ call: 'grant'|'revoke'|'setState'|'clearState', state? }]
 */
export function roleChangePlan(nextState) {
  if (nextState === 'enabled') return [{ call: 'grant' }, { call: 'clearState' }];
  if (nextState === 'disabled') return [{ call: 'grant' }, { call: 'setState', state: 'disabled' }];
  if (nextState === 'hidden') return [{ call: 'revoke' }, { call: 'clearState' }];
  throw new Error('Unknown access state: ' + nextState);
}

/** Does this change need the server's stored states (not just role mappings)? */
export function needsStoredStates(scope, nextState) {
  if (scope !== 'role') return true;
  return nextState === 'disabled';
}
