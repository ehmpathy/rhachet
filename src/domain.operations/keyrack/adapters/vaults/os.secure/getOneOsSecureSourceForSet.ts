import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackKeyReach,
} from '@src/domain.objects/keyrack';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';

/**
 * .what = the source credential os.secure stores: the validated piped one, else the one the
 *         mech's guided setup acquires
 * .why = the set orchestrator names one step for "where the source comes from"
 *
 * .note = draws no tree; the caller opens and closes it
 * .note = context.mech injects the gh runner + prompt (composition root / tests); absent in
 *         prod, where the mech falls back to the real gh cli + terminal
 */
export const getOneOsSecureSourceForSet = async (
  input: {
    slug: string;
    mech: KeyrackGrantMechanism;
    reach: KeyrackKeyReach | undefined;
    sourcePipedValid: string | null;
    mechAdapter: KeyrackGrantMechanismAdapter;
  },
  context?: ContextKeyrack,
): Promise<string> => {
  // a piped source, already validated
  if (input.sourcePipedValid !== null) return input.sourcePipedValid;

  // else the mech's guided setup
  const { source } = await input.mechAdapter.acquireForSet(
    { keySlug: input.slug, reach: input.reach, mech: input.mech },
    context?.mech,
  );
  return source;
};
