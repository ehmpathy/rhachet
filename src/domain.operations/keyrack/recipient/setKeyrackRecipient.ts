import { BadRequestError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { setKeyrackManifestRecipientsSealed } from '@src/domain.operations/keyrack/setKeyrackManifestRecipientsSealed';
import { asAgeRecipientFromSshPubkey } from '@src/infra/ssh/asAgeRecipientFromSshPubkey';

/**
 * .what = add a recipient to the host manifest
 * .why = enables multi-recipient support for backup keys and multi-machine access
 *
 * .note = decrypts manifest via identity discovery (ssh-agent, standard paths)
 * .note = re-encrypts the manifest AND every os.secure blob to all recipients (plus the new one)
 * .note = throws if duplicate label
 *
 * .note = stanza option forces ssh-ed25519 format for ssh-keygen -p prevention flow:
 *         when user plans to add passphrase to a currently-passwordless key,
 *         they add an ssh recipient FIRST (--stanza ssh) so the manifest has
 *         both X25519 and ssh-ed25519 stanzas; either key format can then decrypt
 * .note = os.secure invariant (rule.require.os-secure-seals-to-host-manifest): os.secure
 *         blobs seal to the SAME recipients as the manifest, so a recipient add MUST
 *         re-key every blob to the new set — else the new recipient could open the manifest
 *         but NOT the credentials beside it (an incomplete grant). the re-key + re-seal run
 *         under the shared snapshot-then-rollback HOF, so a mid-flow failure never desyncs
 *         the manifest and its credentials (mirrors delKeyrackRecipient)
 */
export const setKeyrackRecipient = async (input: {
  owner: string | null;
  pubkey: string;
  label: string;
  stanza: 'ssh' | null;
  prikeys?: string[];
}): Promise<KeyrackKeyRecipient> => {
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

  // check for duplicate label
  const labelFound = manifestFound.recipients.find(
    (r) => r.label === input.label,
  );
  if (labelFound)
    throw new BadRequestError('recipient with this label already exists', {
      label: input.label,
      owner,
    });

  // determine pubkey format and mech
  const pubkeyRaw = input.pubkey.trim();
  let mech: 'age' | 'ssh';
  let pubkey: string;

  // if --stanza ssh is specified, force ssh mech (skip conversion to age)
  // this is for ssh-keygen -p prevention flow: add ssh stanza while key is still passwordless
  if (input.stanza === 'ssh') {
    if (!pubkeyRaw.startsWith('ssh-'))
      throw new BadRequestError(
        '--stanza ssh requires ssh pubkey (ssh-ed25519, ssh-rsa, etc.)',
        { pubkeyRaw },
      );
    mech = 'ssh';
    pubkey = pubkeyRaw;
  } else if (pubkeyRaw.startsWith('age1')) {
    mech = 'age';
    pubkey = pubkeyRaw;
  } else if (pubkeyRaw.startsWith('ssh-')) {
    // convert ssh pubkey to age format (enables npm library encryption path)
    mech = 'age';
    pubkey = asAgeRecipientFromSshPubkey({ pubkey: pubkeyRaw });
  } else {
    throw new BadRequestError(
      'pubkey must be age (age1...) or ssh (ssh-ed25519, ssh-rsa, etc.)',
      { pubkeyRaw },
    );
  }

  // create recipient
  const recipient = new KeyrackKeyRecipient({
    mech,
    pubkey,
    label: input.label,
    addedAt: new Date().toISOString(),
  });

  // add to manifest
  const recipientsUpdated = [...manifestFound.recipients, recipient];
  const manifestUpdated = new KeyrackHostManifest({
    ...manifestFound,
    recipients: recipientsUpdated,
  });

  // persist the recipient add as one atomic, no-desync operation — re-key every os.secure
  // blob to the new recipient set, then re-seal the manifest last as the completion marker
  // (rule.require.os-secure-seals-to-host-manifest; the shared choke point mirrors del + migrate)
  await setKeyrackManifestRecipientsSealed(
    { owner, manifestBefore: manifestFound, manifestAfter: manifestUpdated },
    context,
  );

  return recipient;
};
