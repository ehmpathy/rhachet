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
  prikey: string | null;
}): Promise<KeyrackKeyRecipient[]> => {
  const { owner, prikey } = input;

  // load manifest (dao handles identity discovery)
  const manifestFound = await daoKeyrackHostManifest.get({ owner, prikey });
  if (!manifestFound)
    throw new BadRequestError(
      'keyrack manifest not found; run `rhx keyrack init` first',
      { owner },
    );

  return manifestFound.recipients;
};
