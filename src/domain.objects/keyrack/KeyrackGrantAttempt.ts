import type { KeyrackKeyGrant } from './KeyrackKeyGrant';

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
 * .what = key not configured on host
 */
export interface KeyrackGrantAttemptAbsent {
  status: 'absent';
  slug: string;
  message: string;
  fix?: string;
}

/**
 * .what = vault requires unlock
 */
export interface KeyrackGrantAttemptLocked {
  status: 'locked';
  slug: string;
  message: string;
  fix?: string;
}

/**
 * .what = value violates mechanism constraint
 */
export interface KeyrackGrantAttemptBlocked {
  status: 'blocked';
  slug: string;
  reasons: string[];
  fix?: string;
}
