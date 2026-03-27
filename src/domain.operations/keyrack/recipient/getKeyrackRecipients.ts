import { BadRequestError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import type { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';

/**
 * .what = list recipients from the host manifest
 * .why = enables recipient audit and management
 *
 * .note = decrypts manifest via identity discovery (ssh-agent, standard paths)
 */
export const getKeyrackRecipients = async (input: {
  owner: string | null;
  prikeys?: string[];
}): Promise<KeyrackKeyRecipient[]> => {
  const { owner, prikeys } = input;

  // create context with identity discovery
  const context = genContextKeyrack({ owner, prikeys });

  // load manifest (context handles identity discovery)
  const result = await daoKeyrackHostManifest.get({ owner }, context);
  if (!result)
    throw new BadRequestError(
      'keyrack manifest not found; run `rhx keyrack init` first',
      { owner },
    );

  return result.manifest.recipients;
};
