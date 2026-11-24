import { MalfunctionError } from 'helpful-errors';

import type { KeyrackGrantRenewal } from '@src/domain.objects/keyrack/KeyrackGrantMechanismAdapter';
import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

/**
 * .what = renew one held grant via its mech adapter
 * .why = the daemon owns only the schedule; how a credential renews is its mech's
 *        concern, so the daemon asks the adapter and never names a vendor
 *
 * .note = the adapter registry import is lazy, so a daemon that renews no grant never
 *         loads the adapters (rule.require.thinnest-import-path)
 * .note = a grant only reaches here when the unlock opted it in, which it does only for
 *         a mech whose adapter has `renewForDaemon`. a mech without one is an invariant
 *         break, thrown as a MalfunctionError that the tick counts and names
 */
export const getOneGrantRenewal = async (input: {
  grant: KeyrackKeyGrant;
}): Promise<KeyrackGrantRenewal> => {
  // look up the grant's mech adapter
  const { getOneKeyrackMechAdapter } = await import(
    '@src/domain.operations/keyrack/adapters/mechanisms/getOneKeyrackMechAdapter'
  );
  const adapter = getOneKeyrackMechAdapter(input.grant.source.mech);

  // a mech with no renew path was never meant to be filed for renew
  if (!adapter.renewForDaemon)
    throw new MalfunctionError('mech has no renew path', {
      slug: input.grant.slug,
      mech: input.grant.source.mech,
      hint: 'an unlock filed a renew for a mech that cannot renew; report it as a keyrack defect. a fresh unlock holds the key to its ttl',
    });

  // ask the mech to renew the grant; the mech alone reads the fields it renews from
  return adapter.renewForDaemon({ grant: input.grant });
};
