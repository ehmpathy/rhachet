import { MalfunctionError } from 'helpful-errors';

import type {
  KeyrackGrantAttempt,
  KeyrackKeyReach,
} from '@src/domain.objects/keyrack';

import type { FillKeyResult } from './fillKeyrackKeys';

/**
 * .what = halts `fill` when a key it just set AND unlocked cannot be read back
 * .why = a failed roundtrip is not a reason a reach is unavailable on this machine —
 *        it is proof that our own set/unlock/get chain disagrees with itself. an
 *        unregistered app or an absent pem is the caller's world; this is ours
 *
 * .note = the class is the contract here, not the message. a MalfunctionError descends from
 *         MalfunctionError and exits 1 — "keyrack is broken, a human here cannot fix
 *         it". a ConstraintError exits 2 — "close a setup gap and retry". those are opposite
 *         instructions to the human who reads them, and the message below already claims the
 *         first, so the class must agree (rule.require.exit-code-semantics)
 * .note = a named guard rather than an inline `throw` because the class is the whole point:
 *         a test can hold it, and `assertKeyrackFillRoundtrip.test.ts [case2]` does
 */
export const assertKeyrackFillRoundtrip = (input: {
  attempt: KeyrackGrantAttempt;
  keyName: string;
  slug: string;
  owner: string | null;

  /**
   * .what = the reach this roundtrip was verifying, when the repo declared one
   * .why = a slug alone no longer names one key. a fill that provisions three reaches
   *        of `API_KEY` and fails the roundtrip on the second would otherwise report only
   *        `slug: org.env.API_KEY` — true of all three, and so a name for none of them
   */
  reach?: KeyrackKeyReach;

  /**
   * .what = every target already provisioned when this halt fired
   * .why = a fill loop is `keys × owners × reaches`, so a halt on the last target
   *        discards the report for every one before it. the work HAPPENED — the keys are
   *        vaulted — and a caller that cannot see it must either redo it or guess
   */
  resultsSoFar: FillKeyResult[];
}): void => {
  // a granted roundtrip is the expected outcome — no halt is owed
  if (input.attempt.status === 'granted') return;

  throw new MalfunctionError(
    `roundtrip verification failed: key ${input.keyName} was set and unlocked but get returned status=${input.attempt.status}`,
    {
      slug: input.slug,
      owner: input.owner,
      reach: input.reach,
      status: input.attempt.status,
      // .note = the COUNT rides beside the array deliberately. an error's metadata is often
      //         read as one rendered line, where a 40-element array is truncated and its
      //         length lost — so the one number a human needs first is stated outright
      resultsSoFarCount: input.resultsSoFar.length,
      resultsSoFar: input.resultsSoFar,
      hint: `this is a defect in keyrack itself, not a fixable setup gap — the key was written and unlocked, so a get that cannot see it means set, unlock, and get disagree on where it lives`,
    },
  );
};
