// "NOTIFICATIONS ON THIS DEVICE" — the controller: where this device stands,
// and switching it. No JSX. The model is push.js; the design PushToggle.jsx.
import { useCallback, useEffect, useState } from 'react';
import { pushStatus, enablePush, disablePush } from './push.js';

/**
 * @param {{ apiBase: string, workerUrl?: string }|null} push  the app's NavPage `push` prop; null: nothing to show
 */
export function usePushController(push) {
  var [state, setState] = useState(push ? 'loading' : 'unavailable');
  var [busy, setBusy] = useState(false);
  var [error, setError] = useState(null);
  var apiBase = push && push.apiBase;
  var workerUrl = push && push.workerUrl;

  useEffect(function() {
    if (!apiBase) return undefined;
    var live = true;
    pushStatus({ apiBase: apiBase }).then(function(s) { if (live) setState(s); }, function() { if (live) setState('unavailable'); });
    return function() { live = false; };
  }, [apiBase]);

  var toggle = useCallback(function() {
    if (!apiBase || busy) return;
    setBusy(true);
    setError(null);
    var run = state === 'on' ? disablePush({ apiBase: apiBase }) : enablePush({ apiBase: apiBase, workerUrl: workerUrl });
    run.then(setState, function(e) { setError(e && e.message ? e.message : 'Could not change notifications on this device'); })
      .finally(function() { setBusy(false); });
  }, [apiBase, workerUrl, state, busy]);

  return {
    state: state,
    on: state === 'on',
    // Shown at all: everything but "the server has none" (and while asking).
    shown: state !== 'unavailable' && state !== 'loading',
    canToggle: state === 'on' || state === 'off',
    busy: busy,
    error: error,
    toggle: toggle
  };
}
