import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

/**
 * .what = decides whether a grant attempt needs the caller to act (absent or blocked)
 * .why = absent (never set) and blocked (firewall) keys cannot be advanced by an unlock,
 *        so they are caller-fix constraints, not server malfunctions
 */
export const isKeyrackGrantAttemptCallerFix = (input: {
  attempt: KeyrackGrantAttempt;
}): boolean => ['absent', 'blocked'].includes(input.attempt.status);
