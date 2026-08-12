import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

/**
 * .what = render a reach back into the plaintext a human wrote
 * .why = the same exid that parses in must render out — on the `reach:` leaf of every
 *        tree, in a store key, and in the error that names a fix
 *
 * .note = the inverse of asKeyrackKeyReach, and lossless by construction: a reach holds
 *         exactly the exid, so there is no shape to reassemble
 * .note = named `Exid`, never `Uri` — a reach is plaintext. only the github-app mech
 *         imposes a uri convention on its own exids, and it does so on its own
 */
export const asKeyrackKeyReachExid = (input: {
  reach: KeyrackKeyReach;
}): string => input.reach.exid;
