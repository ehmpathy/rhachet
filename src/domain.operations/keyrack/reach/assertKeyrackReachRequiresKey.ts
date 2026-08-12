import { ConstraintError } from 'helpful-errors';

import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';

/**
 * .what = refuses a reach that rides a BULK ask — one reach named, no key named
 * .why = a reach is an identity axis of ONE key. to apply it across a sweep would ask the
 *        caller which keys it meant: the ones that hold that reach? the ones that do not?
 *        that is one word with two senses, which `rule.forbid.ambiguous-labels` forbids
 *
 * .why one home = this invariant was hand-authored at four call sites, and each had phrased
 *         it differently ("requires --key" / "requires a key selector" / "not for every key in
 *         an env" / "not for every key in a repo"). one rule stated four ways reads as four
 *         rules to anyone who greps. every other reach invariant in this subsystem already has
 *         a single home — `assertKeyrackReachAbsent`, `assertKeyrackReachAddressable`,
 *         `assertKeyrackHostAddressed` — and this one owed the same treatment
 *
 * .note = the MESSAGE is shared so it cannot drift again; the HINT stays per-caller, because
 *         the fix a human copy-pastes is command-shaped (`unlock` vs `get` vs `source`) and a
 *         shared hint would name the wrong command (`rule.require.errors-name-the-fix`)
 * .note = `keyed` is a boolean rather than the selector itself, deliberately: the four callers
 *         hold the selector in four shapes (`key?: string`, `slugs?: string[]`, a repo-wide
 *         flag). to accept each shape here would drag their differences into the one place
 *         that exists to hold what they share
 *
 * .note = this is the LOOSENABLE direction. to relax the rule later — once a reach-aware sweep
 *         exists — is a clean rework; to tighten one after callers depend on the looseness is
 *         not. so the strict form is the safe default (q2)
 */
export const assertKeyrackReachRequiresKey = (input: {
  reach?: KeyrackKeyReach | null;
  keyed: boolean;
  hint: string;
}): void => {
  // a reachless ask is untouched — e1, zero new branches taken
  if (!input.reach) return;

  // a keyed ask is exactly what a reach is for
  if (input.keyed) return;

  throw new ConstraintError(
    '--reach requires a key: a reach is an identity axis of ONE key, so it is meaningless across a sweep',
    {
      reach: asKeyrackKeyReachExid({ reach: input.reach }),
      hint: input.hint,
    },
  );
};
