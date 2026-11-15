import type { KeyrackDaemonUnlockRenewal } from '@src/domain.objects/keyrack/KeyrackDaemonUnlockRenewal';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

/**
 * .what = the mech whose grants the daemon can renew silently
 * .why = only an sso grant has a silent path; every other mech is never renewed
 */
const MECH_RENEWABLE = 'EPHEMERAL_VIA_AWS_SSO';

/**
 * .what = the renewal an unlock sent for this grant, if the grant may renew
 * .why = a grant renews only when the cli opted it in (a renewal at its exact address)
 *        and its mech has a silent path; every other grant is never renewed
 *
 * .note = matched by full address (slug at reach), the key the renew record files under
 */
export const getOneUnlockRenewalForGrant = (input: {
  grant: KeyrackKeyGrant;
  renewals: KeyrackDaemonUnlockRenewal[];
}): KeyrackDaemonUnlockRenewal | null => {
  // a mech with no silent path is never renewed
  if (input.grant.source.mech !== MECH_RENEWABLE) return null;

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
