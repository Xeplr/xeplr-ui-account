import { memo } from 'react';
import { usePushController } from '../usePushController.js';

// "Notifications on this device" — a switch in the settings menu. Presentation
// only: the controller (usePushController) says where this device stands.
// Renders nothing when the app passed no `push`, or the server has no keys.
var HINTS = {
  install: 'On an iPhone, add this app to your Home Screen first (Share → Add to Home Screen) and open it from there.',
  blocked: 'Notifications are blocked for this app. Allow them in the browser or the phone\'s settings, then switch them on here.',
  unsupported: 'This browser cannot show notifications.'
};

function PushToggle({ push }) {
  var c = usePushController(push || null);
  if (!push || !c.shown) return null;
  return (
    <div className="xeplr-nav-push">
      <div className="xeplr-nav-push-row">
        <span className="xeplr-nav-push-label" id="xeplr-nav-push-label">Notifications on this device</span>
        {c.canToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={c.on}
            aria-labelledby="xeplr-nav-push-label"
            className={'xeplr-nav-push-switch' + (c.on ? ' xeplr-nav-push-switch-on' : '')}
            onClick={c.toggle}
            disabled={c.busy}
          >
            <span className="xeplr-nav-push-knob" />
          </button>
        )}
      </div>
      {HINTS[c.state] && <div className="xeplr-nav-push-hint">{HINTS[c.state]}</div>}
      {c.error && <div className="xeplr-nav-push-hint xeplr-nav-push-error" role="alert">{c.error}</div>}
    </div>
  );
}

export default memo(PushToggle);
