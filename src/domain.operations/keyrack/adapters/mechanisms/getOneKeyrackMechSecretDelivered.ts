import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack/KeyrackGrantMechanismAdapter';

import { asGithubAppMintFaultWithCure } from './asGithubAppMintFaultWithCure';

/**
 * .what = deliver the usable secret from a stored source, via its mech; a github-app mint
 *         refusal carries the cure the vault names
 * .why = every vault that holds a github-app blob must append its own cure to a mint refusal;
 *        one call does the delivery and the cure together, so a new vault cannot forget the cure
 *
 * .note = mech-neutral by design: any mech delivers through it, and only a github-app mint
 *         refusal (`asGithubAppMintFaultError`) gains the cure; every other fault is rethrown
 *         untouched
 * .note = the cure is a thunk, built only inside the catch, so a read that succeeds (every
 *         replica read, every mint) builds no command
 */
export const getOneKeyrackMechSecretDelivered = async (input: {
  mechAdapter: KeyrackGrantMechanismAdapter;
  source: string;
  cure: () => string;
}): Promise<{ secret: string; expiresAt?: IsoTimeStamp }> =>
  input.mechAdapter
    .deliverForGet({ source: input.source })
    .catch((error: unknown) => {
      throw asGithubAppMintFaultWithCure({ error, cure: input.cure() });
    });
