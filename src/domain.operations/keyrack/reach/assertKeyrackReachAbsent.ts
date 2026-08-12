import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type {
  KeyrackGrantMechanism,
  KeyrackKeyReach,
} from '@src/domain.objects/keyrack';
import { KEYRACK_MECH_REACH_POLICY } from '@src/domain.objects/keyrack/KeyrackMechReachPolicy';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';

/**
 * .what = refuse a reach a mechanism cannot honor
 * .why = a mech that cannot act on a reach must reject it, never drop it. a silently
 *        ignored reach would store a credential that opens somewhere other than what the
 *        human asked for — the wrong-reach failure this design forbids (e13)
 *
 * .note = the three-way split this guard sits on — DERIVED / DECLARED / REFUSED — is declared
 *         at `KeyrackMechReachPolicy`, and this guard READS that table rather than restates
 *         it. so the policy has exactly one home, and a mech's answer cannot differ between
 *         the table and the guard
 *
 * .note = one guard, shared by every refused mech, so the refusal is the same refusal
 *         everywhere rather than N hand-copied near-misses
 * .note = a mech that honors a reach — derived or declared — simply never calls this. if one
 *         does, that is a WIRE defect (an adapter reached for the wrong guard), so it throws
 *         a MalfunctionError rather than a ConstraintError — the caller is at no fault, and
 *         to refuse their legitimate reach would be the silent-wrong-answer this whole axis
 *         exists to prevent
 */
export const assertKeyrackReachAbsent = (input: {
  reach?: KeyrackKeyReach;
  mech: KeyrackGrantMechanism;
}): void => {
  if (!input.reach) return;

  // a mech that honors a reach must never arrive here — the table is the authority
  const policy = KEYRACK_MECH_REACH_POLICY[input.mech];
  if (policy !== 'REFUSED')
    throw new MalfunctionError(
      `assertKeyrackReachAbsent called for ${input.mech}, whose reach policy is ${policy}`,
      {
        mech: input.mech,
        policy,
        hint: 'a DERIVED or DECLARED mech honors a reach; it must not call this guard. fix the adapter, or correct KEYRACK_MECH_REACH_POLICY if the mech genuinely refuses',
      },
    );

  const exid = asKeyrackKeyReachExid({ reach: input.reach });
  throw new ConstraintError(
    `--reach does not apply to ${input.mech}: this mech mints against its own axis, so a reach would move where the value is filed yet leave what it opens untouched — a name that lies`,
    {
      reach: exid,
      mech: input.mech,
      hint: `drop --reach ${exid}; or set a key whose mech mints a reach (EPHEMERAL_VIA_GITHUB_APP); or one that declares a reach (PERMANENT_VIA_REPLICA)`,
    },
  );
};
