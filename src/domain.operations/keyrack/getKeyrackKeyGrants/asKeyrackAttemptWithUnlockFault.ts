import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';

import { asKeyrackErroredKeyTip } from '../cli/asKeyrackErroredKeyTip';
import { asKeyrackAttemptAddress } from '../reach/asKeyrackAttemptAddress';
import { asKeyrackKeySlugAtReach } from '../reach/asKeyrackKeySlugAtReach';

/**
 * .what = a locked attempt, with the fault its unlock caught as its tip
 * .why = `get --unlock` re-reads after its unlock; a key whose unlock faulted (a stale blob, a
 *        refused mint) comes back `locked`, and its stock tip says "run unlock" — the very call
 *        that just failed. the tip must name the fault and its fix instead
 *
 * .note = the status stays `locked`: the key is still not held, and every surface that grades a
 *         locked key after an unlock (exit codes, the secrets map) reads it as it does today
 * .note = matched by address (slug + reach), the same identity the re-get merge keys by
 */
export const asKeyrackAttemptWithUnlockFault = (input: {
  attempt: KeyrackGrantAttempt;
  omissions: KeyrackKeyOmission[];
  orgDefault: string | null;
  owner: string | null;
}): KeyrackGrantAttempt => {
  // only a locked attempt can carry an unlock fault
  if (input.attempt.status !== 'locked') return input.attempt;

  // find the errored omission at this attempt's address
  const address = asKeyrackAttemptAddress({ attempt: input.attempt });
  const omissionErrored = input.omissions.find(
    (omission) =>
      omission.reason === 'errored' &&
      asKeyrackKeySlugAtReach({
        slug: omission.slug,
        reach: omission.reach,
      }) === address,
  );
  if (!omissionErrored) return input.attempt;

  // the fault's own tip replaces the stock "run unlock" tip
  return {
    ...input.attempt,
    fix: asKeyrackErroredKeyTip({
      cause: omissionErrored.cause,
      slug: input.attempt.slug,
      orgDefault: input.orgDefault,
      owner: input.owner,
    }),
  };
};
