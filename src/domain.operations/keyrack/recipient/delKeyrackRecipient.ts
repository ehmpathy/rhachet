import { BadRequestError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '../../../access/daos/daoKeyrackHostManifest';
import { KeyrackHostManifest } from '../../../domain.objects/keyrack';

/**
 * .what = remove a recipient from the host manifest
 * .why = enables key rotation and revocation
 *
 * .note = decrypts manifest via identity discovery (ssh-agent, standard paths)
 * .note = re-encrypts to rest of recipients
 * .note = throws if label not found
 * .note = throws if would remove last recipient
 */
export const delKeyrackRecipient = async (input: {
  owner?: string | null;
  label: string;
}): Promise<void> => {
  const owner = input.owner ?? null;

  // load manifest (dao handles identity discovery)
  const manifestFound = await daoKeyrackHostManifest.get({ owner });
  if (!manifestFound)
    throw new BadRequestError(
      'keyrack manifest not found; run `rhx keyrack init` first',
      { owner },
    );

  // find recipient by label
  const recipientIndex = manifestFound.recipients.findIndex(
    (r) => r.label === input.label,
  );
  if (recipientIndex === -1)
    throw new BadRequestError('recipient not found', {
      label: input.label,
      owner,
    });

  // check not last recipient
  if (manifestFound.recipients.length === 1)
    throw new BadRequestError(
      'cannot remove last recipient; at least one recipient is required',
      { label: input.label, owner },
    );

  // remove recipient
  const recipientsUpdated = [
    ...manifestFound.recipients.slice(0, recipientIndex),
    ...manifestFound.recipients.slice(recipientIndex + 1),
  ];

  // create updated manifest
  const manifestUpdated = new KeyrackHostManifest({
    ...manifestFound,
    recipients: recipientsUpdated,
  });

  // re-encrypt to rest of recipients
  await daoKeyrackHostManifest.set({ upsert: manifestUpdated });
};
