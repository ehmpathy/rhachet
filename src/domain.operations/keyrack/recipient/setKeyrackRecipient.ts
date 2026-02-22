import { BadRequestError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';

/**
 * .what = add a recipient to the host manifest
 * .why = enables multi-recipient support for backup keys and multi-machine access
 *
 * .note = decrypts manifest via identity discovery (ssh-agent, standard paths)
 * .note = re-encrypts to all recipients (plus the new one)
 * .note = throws if duplicate label
 *
 * .note = stanza option forces ssh-ed25519 format for ssh-keygen -p prevention flow:
 *         when user plans to add passphrase to a currently-passwordless key,
 *         they add an ssh recipient FIRST (--stanza ssh) so the manifest has
 *         both X25519 and ssh-ed25519 stanzas; either key format can then decrypt
 */
export const setKeyrackRecipient = async (input: {
  owner?: string | null;
  pubkey: string;
  label: string;
  stanza?: 'ssh';
}): Promise<KeyrackKeyRecipient> => {
  const owner = input.owner ?? null;

  // load manifest (dao handles identity discovery)
  const manifestFound = await daoKeyrackHostManifest.get({ owner });
  if (!manifestFound)
    throw new BadRequestError(
      'keyrack manifest not found; run `rhx keyrack init` first',
      { owner },
    );

  // check for duplicate label
  const labelFound = manifestFound.recipients.find(
    (r) => r.label === input.label,
  );
  if (labelFound)
    throw new BadRequestError('recipient with this label already exists', {
      label: input.label,
      owner,
    });

  // resolve pubkey and determine mech
  const pubkey = input.pubkey.trim();
  let mech: 'age' | 'ssh';

  // if --stanza ssh is specified, force ssh mech (skip cipher-aware conversion)
  // this is for ssh-keygen -p prevention flow: add ssh stanza while key is still passwordless
  if (input.stanza === 'ssh') {
    if (!pubkey.startsWith('ssh-'))
      throw new BadRequestError(
        '--stanza ssh requires ssh pubkey (ssh-ed25519, ssh-rsa, etc.)',
        { pubkey },
      );
    mech = 'ssh';
  } else if (pubkey.startsWith('age1')) {
    mech = 'age';
  } else if (pubkey.startsWith('ssh-')) {
    mech = 'ssh';
  } else {
    throw new BadRequestError(
      'pubkey must be age (age1...) or ssh (ssh-ed25519, ssh-rsa, etc.)',
      { pubkey },
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
  const manifestUpdated = new KeyrackHostManifest({
    ...manifestFound,
    recipients: [...manifestFound.recipients, recipient],
  });

  // re-encrypt to all recipients
  await daoKeyrackHostManifest.set({ upsert: manifestUpdated });

  return recipient;
};
