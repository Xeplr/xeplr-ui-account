// The picker's controller for a view — createScopeChoice (scopeChoice.js),
// started once, re-rendering when it changes. No JSX: the website's picker
// page and a phone app's (NativeScopePicker) are only views of this.
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createScopeChoice } from './scopeChoice.js';

export function useScopeChoice(options) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const choice = useMemo(() => createScopeChoice(options), []);
  useEffect(() => { choice.start(); }, [choice]);
  const state = useSyncExternalStore(choice.subscribe, choice.getState);
  return Object.assign({}, state, { choose: choice.choose, setAdding: choice.setAdding, add: choice.add, finish: choice.finish });
}
