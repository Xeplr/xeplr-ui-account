// @xeplr/ui-account/native — signing in on a phone (React Native / Expo).
//
//   import { hydrateStorage, startSession, useSession, NativeSignIn } from '@xeplr/ui-account/native'
//
// The session (who, what they may see, the server) uses this package's own
// calls — the same login, tokens and refresh as the website. NativeSignIn is
// drawn with @xeplr/ui-factory/native's parts (an optional peer: install it in
// a phone app). See README → "On a phone".
export { hydrateStorage, remember } from './storage.js'
export {
  startSession, useSession, cleanServer, startingServer, refreshAccess,
  signInOptions, signIn, sendSignInCode, signInWithCode, sendSecondCode, finishSecondStep, signOut
} from './session.js'
export { NativeSignIn } from './NativeSignIn.jsx'
// Where the app's data belongs — the company (and workspace) picker, for apps whose data is split by company.
export { NativeScopePicker } from './NativeScopePicker.jsx'
export { scopeChosen } from '../scopeChoice.js'
export { registerMTs } from '../mt.js'
export { clearActiveScope } from '../activeScope.js'
// What a phone app's own screens call with: the signed fetches (hand them to @xeplr/ui-factory's createFactoryApi).
export { authFetch, authFetchFile } from '../api.js'
export { getUser } from '../token.js'
