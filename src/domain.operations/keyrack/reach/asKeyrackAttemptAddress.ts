import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

/**
 * .what = the reach an attempt asked for, whatever its status
 * .why = a granted attempt carries it on `grant.reach` and every other status carries it
 *        beside `slug`. a caller that needs it uniformly should not re-derive the split —
 *        the twin of `asKeyrackAttemptSlug`, for the other half of the identity
 */
export const asKeyrackAttemptReach = (input: {
  attempt: KeyrackGrantAttempt;
}): KeyrackKeyReach | undefined =>
  input.attempt.status === 'granted'
    ? input.attempt.grant.reach
    : input.attempt.reach;

/**
 * .what = the FULL identity of an attempt — its slug AND the reach it asked for
 * .why = reach is an identity axis, so any collection that holds attempts must key by both.
 *        a slug-keyed map over a sweep that enumerates reaches silently evicts one
 *        reach with another — and the eviction reads as a status, so a `locked` reach
 *        would render as `granted` because its reachless peer was
 *
 * .note = a reachless attempt addresses as its bare slug, byte for byte, so every extant
 *         slug-keyed behavior is unchanged (e1)
 */
export const asKeyrackAttemptAddress = (input: {
  attempt: KeyrackGrantAttempt;
}): string =>
  asKeyrackKeySlugAtReach({
    slug:
      input.attempt.status === 'granted'
        ? input.attempt.grant.slug
        : input.attempt.slug,
    reach: asKeyrackAttemptReach({ attempt: input.attempt }),
  });
