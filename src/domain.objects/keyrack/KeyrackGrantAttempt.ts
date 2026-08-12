import type { KeyrackKeyGrant } from './KeyrackKeyGrant';
import type { KeyrackKeyReach } from './KeyrackKeyReach';

/**
 * .what = result of attempt to grant a key
 * .why = discriminated union enables typed handler for all outcomes
 *
 * .note = this is the "envelope" — contains either a grant or error info
 */
export type KeyrackGrantAttempt =
  | KeyrackGrantAttemptGranted
  | KeyrackGrantAttemptAbsent
  | KeyrackGrantAttemptLocked
  | KeyrackGrantAttemptBlocked;

/**
 * .what = successful grant result
 */
export interface KeyrackGrantAttemptGranted {
  status: 'granted';
  grant: KeyrackKeyGrant;
}

/**
 * .what = the reach this attempt asked for; absent means the reachless key
 * .why = a granted attempt carries its reach on `grant.reach`, so without the same
 *        field here a NON-granted attempt is addressable by slug alone — and a slug is not
 *        an identity once reach is an axis. two reaches of one key that both come back
 *        `locked` would be indistinguishable, so any collection keyed by their slug evicts
 *        one with the other, which is the silent-drop this feature exists to remove
 *
 * .note = OPTIONAL, never nullable (e16). `JSON.stringify` drops `undefined` and keeps
 *         `null`, so a reachless attempt serializes byte for byte as it does today
 */
interface KeyrackGrantAttemptAtReach {
  reach?: KeyrackKeyReach;
}

/**
 * .what = key not configured on host
 */
export interface KeyrackGrantAttemptAbsent extends KeyrackGrantAttemptAtReach {
  status: 'absent';
  slug: string;
  message: string;
  fix?: string;
}

/**
 * .what = vault requires unlock
 */
export interface KeyrackGrantAttemptLocked extends KeyrackGrantAttemptAtReach {
  status: 'locked';
  slug: string;
  message: string;
  fix?: string;
}

/**
 * .what = value violates mechanism constraint
 */
export interface KeyrackGrantAttemptBlocked extends KeyrackGrantAttemptAtReach {
  status: 'blocked';
  slug: string;
  reasons: string[];
  fix?: string;
}
