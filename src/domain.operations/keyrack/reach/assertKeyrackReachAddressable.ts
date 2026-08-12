import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type {
  KeyrackHostVault,
  KeyrackKeyReach,
} from '@src/domain.objects/keyrack';
import { KEYRACK_VAULT_REACH_POLICY } from '@src/domain.objects/keyrack/KeyrackVaultReachPolicy';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';

/**
 * .what = refuse a reach a VAULT cannot file, because its storage address has no room for a
 *         reach axis
 * .why = a reach partitions storage: two reaches of one slug are two values, filed apart.
 *        a vault whose address is a flat name cannot hold that partition — so it must refuse
 *        the reach, never accept it and collapse the two onto one address
 *
 * .note = this is the VAULT-address twin of `assertKeyrackReachAbsent`, which refuses on the
 *         MECH axis. the two are separate refusals with one shape: a mech refuses because a
 *         reach would not change what its credential opens; a vault refuses because it has
 *         nowhere to put the second one
 * .note = the consequence differs by direction, and the message says which, because they are
 *         different harms and a human debugs them differently:
 *
 *         read  — the flat address yields the REACHLESS value, so a reach-ask is answered
 *                 with a live credential for the WRONG reach (e18's class)
 *         write — the flat address is shared, so a second reach OVERWRITES the first and
 *                 a credential is lost with no signal
 *
 * .note = the callers split into two kinds, and the hint says which — one refusal, two remedies:
 *
 *         ci-path (`os.envvar`, `github.secrets`) — ci has no keyrack host manifest, so it has
 *                 no reach to name; it has only the blob it was handed. the refusal makes that
 *                 boundary explicit rather than a surprise to meet in production (q9, e20)
 *         path-templated (`aws.params`) — it DOES run where a host manifest exists, so the ci
 *                 sentence would be false for it. its address is a hierarchical SSM path whose
 *                 `/v1/` template simply carries no reach segment yet, so the remedy is a
 *                 distinct key name, and a `/v2/` template is the additive way to `ADDRESSED`
 *
 * .note = the three-way split this guard sits on — ADDRESSED / UNADDRESSABLE / VIA_MECH — is
 *         declared at `KeyrackVaultReachPolicy`, and this guard READS that table rather than
 *         restates it. so the policy has exactly one home, and a vault's answer cannot differ
 *         between the table and the guard. this half was absent until 2026-08-06: the table
 *         was checked only at test time, so the vault axis had ONE line of defense where the
 *         mech axis had two, and the "structural backstop" the table claims did not fully hold
 * .note = a vault that CAN file a reach must never arrive here. if one does, that is a WIRE
 *         defect (an adapter reached for the wrong guard), so it throws an
 *         `MalfunctionError` rather than a `ConstraintError` — the caller is at no
 *         fault, and to refuse their legitimate reach would be the silent-wrong-answer this
 *         whole axis exists to prevent. symmetric with `assertKeyrackReachAbsent`
 */
export const assertKeyrackReachAddressable = (input: {
  reach?: KeyrackKeyReach;
  vault: KeyrackHostVault;
  direction: 'read' | 'write';
}): void => {
  if (!input.reach) return;

  // a vault that can file a reach must never arrive here — the table is the authority
  const policy = KEYRACK_VAULT_REACH_POLICY[input.vault];
  if (policy !== 'UNADDRESSABLE')
    throw new MalfunctionError(
      `assertKeyrackReachAddressable called for ${input.vault}, whose reach policy is ${policy}`,
      {
        vault: input.vault,
        policy,
        hint: 'an ADDRESSED vault files a reach into its own address, and a VIA_MECH vault defers to assertKeyrackReachAbsent; neither must call this guard. fix the adapter, or correct KEYRACK_VAULT_REACH_POLICY if the vault genuinely cannot address a reach',
      },
    );

  const exid = asKeyrackKeyReachExid({ reach: input.reach });
  const consequence =
    input.direction === 'read'
      ? `so a reach-ask would be answered with the reachless value — a live credential for the wrong reach`
      : `so a second reach of this key would overwrite the first, and a credential would be lost with no signal`;

  // ⚠️ the REMEDY differs by WHY the address has no reach axis, though the refusal is the same.
  //    a hint that named the ci reason for `aws.params` would be a correct refusal with a false
  //    fix — the very defect the ADDRESSED/VIA_MECH split exists to avoid, one level down in the
  //    hint rather than the message (`rule.require.errors-name-the-fix`)
  const hint =
    input.vault === 'aws.params'
      ? `the v1 param path has no reach segment — cut this key under its own key name (or an explicit --exid), then ask for it without --reach`
      : `ci holds blobs, never reaches — supply the target reach's credential under its own name, then ask for it without --reach`;

  throw new ConstraintError(
    `--reach does not apply to ${input.vault}: its storage address carries no reach, ${consequence}`,
    {
      reach: exid,
      vault: input.vault,
      direction: input.direction,
      hint,
    },
  );
};
