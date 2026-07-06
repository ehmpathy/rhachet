import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

/**
 * .what = extract the slug from any keyrack grant attempt, regardless of status
 * .why = a granted attempt carries its slug under `grant.slug`, while every non-granted
 *        status (absent | locked | blocked) carries it under `slug`. callers that need the
 *        slug uniformly (re-get after unlock, cli status render) should not re-derive this.
 */
export const asKeyrackAttemptSlug = (input: {
  attempt: KeyrackGrantAttempt;
}): string =>
  input.attempt.status === 'granted'
    ? input.attempt.grant.slug
    : input.attempt.slug;
