import type { KeyrackHostVault } from '@src/domain.objects/keyrack/KeyrackHostVault';
import { KEYRACK_VAULT_REACH_POLICY } from '@src/domain.objects/keyrack/KeyrackVaultReachPolicy';

/**
 * .what = whether a vault's storage address carries NO reach axis, so it cannot tell one reach
 *   from another once a value is filed
 * .why = the question is asked at two remote sites in one loop with OPPOSITE consequences — a
 *   silent skip of an enumerated reach, and a loud `ConstraintError` on a named one — and each
 *   read it as a raw dictionary equality against a bare string literal. a reader met the decode
 *   step twice and had to re-derive the same sense both times
 *
 * .note = it names ONE of the three postures. `VIA_MECH` also refuses, but for a different cause
 *   and with a different sentence for the human, so it must never fold in here — see
 *   `KeyrackVaultReachPolicy`'s own note on why that distinction is not academic
 * .note = the policy table stays the single source; this only spares each caller the equality
 */
export const isKeyrackVaultReachUnaddressable = (input: {
  vault: KeyrackHostVault;
}): boolean => KEYRACK_VAULT_REACH_POLICY[input.vault] === 'UNADDRESSABLE';
