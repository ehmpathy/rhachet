import type {
  KeyrackGrantMechanism,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';
import { inferKeyrackMechForSet } from '@src/domain.operations/keyrack/inferKeyrackMechForSet';

/**
 * .what = settle which mechanism a `set` should use for an aws.params key
 * .why = the choice has two ordered sources — an explicit --mech, else an interactive prompt. a
 *        named operation keeps set()'s orchestrator a narrative
 *        (rule.prefer.decomposable-architecture): set reads one line instead of a branch decode
 *
 * .note = the vault is passed in (not imported) so this stays free of a cycle with the adapter
 */
export const getOneKeyrackAwsParamMechForSet = async (input: {
  mech: KeyrackGrantMechanism | null | undefined;
  vault: KeyrackHostVaultAdapter;
}): Promise<KeyrackGrantMechanism> => {
  // an explicit --mech wins
  if (input.mech) return input.mech;

  // otherwise prompt (or auto-select a single-mech vault) via the shared set-flow inference
  return inferKeyrackMechForSet({ vault: input.vault });
};
