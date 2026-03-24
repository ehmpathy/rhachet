import { BadRequestError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import type { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';

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

  // load manifest (dao handles identity discovery)
  const result = await daoKeyrackHostManifest.get({ owner, prikeys });
  if (!result)
    throw new BadRequestError(
      'keyrack manifest not found; run `rhx keyrack init` first',
      { owner },
    );

  return result.manifest.recipients;
};
