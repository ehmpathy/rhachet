import type { KeyrackDaemonUnlockRenewal } from '@src/domain.objects/keyrack/KeyrackDaemonUnlockRenewal';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

/**
 * .what = the renewal an unlock sent for this grant, if any
 * .why = a grant renews only when the unlock opted it in, with a renewal at its exact
 *        address. the unlock opts in only a grant whose mech adapter can renew, so the
 *        daemon keeps no list of renewable mechs of its own
 *
 * .note = matched by full address (slug at reach), the key the renew record files under
 */
export const getOneUnlockRenewalForGrant = (input: {
  grant: KeyrackKeyGrant;
  renewals: KeyrackDaemonUnlockRenewal[];
}): KeyrackDaemonUnlockRenewal | null => {
  // find the renewal at this grant's exact address
  const address = asKeyrackKeySlugAtReach({
    slug: input.grant.slug,
    reach: input.grant.reach,
  });
  return (
    input.renewals.find(
      (candidate) =>
        asKeyrackKeySlugAtReach({
          slug: candidate.slug,
          reach: candidate.reach,
        }) === address,
    ) ?? null
  );
};
