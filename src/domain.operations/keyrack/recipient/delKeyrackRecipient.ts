import { BadRequestError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { KeyrackHostManifest } from '@src/domain.objects/keyrack';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { setKeyrackManifestRecipientsSealed } from '@src/domain.operations/keyrack/setKeyrackManifestRecipientsSealed';

/**
 * .what = remove a recipient from the host manifest
 * .why = enables key rotation and revocation
 *
 * .note = decrypts manifest via identity discovery (ssh-agent, standard paths)
 * .note = re-encrypts the manifest AND every os.secure blob to the rest of the recipients
 * .note = throws if label not found
 * .note = throws if would remove last recipient
 * .note = derive-not-store keeps NO stored secret beside the manifest, so there is
 *         no sidecar to clean up on a recipient removal (the old wrap-identity file
 *         is gone). the derive-not-store recipient K is re-derived from the ssh signature
 * .note = os.secure invariant (rule.require.os-secure-seals-to-host-manifest): os.secure
 *         blobs seal to the SAME recipients as the manifest, so a removal MUST re-key every
 *         blob to the rest of the set — else the dropped recipient could still open the
 *         credentials (an incomplete revocation). the re-key + re-seal run under the shared
 *         snapshot-then-rollback HOF, so a mid-flow failure never desyncs the two
 */
export const delKeyrackRecipient = async (input: {
  owner: string | null;
  label: string;
  prikeys?: string[];
}): Promise<void> => {
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
  const manifestFound = result.manifest;

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

  // persist the recipient removal as one atomic, no-desync operation — re-key every
  // os.secure blob to the rest of the recipients, then re-seal the manifest last as the
  // completion marker, so the dropped recipient can no longer open the credentials
  // (rule.require.os-secure-seals-to-host-manifest; the shared choke point mirrors set + migrate)
  await setKeyrackManifestRecipientsSealed(
    { owner, manifestBefore: manifestFound, manifestAfter: manifestUpdated },
    context,
  );
};
