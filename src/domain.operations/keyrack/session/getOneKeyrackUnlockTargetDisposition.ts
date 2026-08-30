import type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

import { isKeyrackVaultReachUnaddressable } from '../reach/isKeyrackVaultReachUnaddressable';

/**
 * .what = decide what an unlock loop does with one target: skip it, and whether it may vouch
 *   that its slug was reported on at a reach
 * .why = the loop held two statements whose ORDER carried the whole guarantee — a `continue`
 *   that drops a target, then a `slugsHeldAtReach.add` that vouches for it. read apart they
 *   each look harmless; read together they encode one invariant, and a future edit that swapped
 *   or split them would silently suppress the very row the human needs (`rule.forbid.failhide`).
 *   one leaf gives that invariant a single home, a name, and a unit-grain clamp
 *
 * .note = the invariant, stated once: a SKIPPED target files no row, so it has no claim to
 *   vouch that its slug was reported on. `skipped` therefore always implies
 *   `marksSlugHeldAtReach === false`, and the test pins exactly that pair
 * .note = the skip is gated on `!reachAsked` on purpose. a reach the CALLER named still owes
 *   the loud refusal `assertKeyrackReachAddressable` files — only an ENUMERATED reach, which
 *   the human never asked for, may be dropped in silence
 */
export const getOneKeyrackUnlockTargetDisposition = (input: {
  reachTarget?: KeyrackKeyReach;
  reachAsked?: KeyrackKeyReach;
  vault: KeyrackHostVault;
}): { skipped: boolean; marksSlugHeldAtReach: boolean } => {
  const skipped =
    !!input.reachTarget &&
    !input.reachAsked &&
    isKeyrackVaultReachUnaddressable({ vault: input.vault });

  if (skipped) return { skipped: true, marksSlugHeldAtReach: false };

  return { skipped: false, marksSlugHeldAtReach: !!input.reachTarget };
};
