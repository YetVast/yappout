// src/auth/index.ts
// Public entrypoint for YappOut V1 authentication foundation

export * from './types';
export {
  YAPPOUT_SESSION_COOKIE,
  YAPPOUT_TX_COOKIE,
  YAPPOUT_DEFAULT_APP_ID,
  DEFAULT_AUTH_SERVER_ORIGIN,
} from './config';
export { assertionToYappoutUser } from './identityService';
