import { ConstraintError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';

/**
 * .what = refuse when the owner has no host keyrack, so a token has nowhere to be filed
 * .why = `set` runs this before the browser login: a login that cannot be filed is lost once its
 *   temp dir is removed, so the human must hear of the absent keyrack first, with its fix
 * .note = the read loads the manifest into the given keyrack context, so a write after it needs no
 *   second read
 */
export const assertBrainAuthSlotWritable = async (
  input: { owner: string | null },
  context: ReturnType<typeof genContextKeyrack> = genContextKeyrack({
    owner: input.owner,
  }),
): Promise<void> => {
  const loaded = await daoKeyrackHostManifest.get(
    { owner: input.owner },
    context,
  );
  if (loaded) return;
  throw new ConstraintError(
    'no keyrack for this owner, so a login cannot be filed',
    {
      owner: input.owner ?? 'default',
      hint: `rhx keyrack init --owner ${input.owner ?? 'default'}   # then retry`,
    },
  );
};
