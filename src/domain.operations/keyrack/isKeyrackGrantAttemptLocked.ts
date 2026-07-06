import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

/**
 * .what = decides whether a grant attempt is locked (needs an unlock before it can be granted)
 * .why = locked is the only status an auto-unlock can advance to granted; absent/blocked cannot
 */
export const isKeyrackGrantAttemptLocked = (input: {
  attempt: KeyrackGrantAttempt;
}): boolean => input.attempt.status === 'locked';
