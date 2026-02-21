import * as age from 'age-encryption';
import { UnexpectedCodePathError } from 'helpful-errors';

import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { KeyrackKeyRecipient } from '../../../domain.objects/keyrack';
import { SSH_KEY_PATH_MARKER } from '../../../infra/ssh';

/**
 * .what = encrypt plaintext to multiple age recipients
 * .why = enables multi-recipient manifest encryption
 *
 * .note = cipher-aware dispatch:
 *         - mech 'age' (age1... pubkey): npm library → X25519 stanza
 *         - mech 'ssh' (ssh-ed25519... pubkey): age CLI → ssh-ed25519 stanza
 * .note = returns ascii-armored ciphertext for readability
 */
export const encryptToRecipients = async (input: {
  plaintext: string;
  recipients: KeyrackKeyRecipient[];
}): Promise<string> => {
  // validate at least one recipient
  if (input.recipients.length === 0)
    throw new UnexpectedCodePathError('no recipients provided for encryption', {
      recipientCount: input.recipients.length,
    });

  // check if any recipient requires age CLI (mech: 'ssh')
  const hasSshRecipient = input.recipients.some((r) => r.mech === 'ssh');

  // if all recipients are native age (mech: 'age'), use npm library
  if (!hasSshRecipient) {
    const encrypter = new age.Encrypter();
    for (const recipient of input.recipients) {
      if (recipient.mech !== 'age')
        throw new UnexpectedCodePathError(
          `recipient mech '${recipient.mech}' not supported; use 'age' or 'ssh'`,
          { recipient },
        );
      encrypter.addRecipient(recipient.pubkey);
    }
    const ciphertext = await encrypter.encrypt(input.plaintext);
    return age.armor.encode(ciphertext);
  }

  // if any recipient is ssh, use age CLI for all (produces matched stanzas)
  return encryptWithAgeCLI({
    plaintext: input.plaintext,
    recipients: input.recipients,
  });
};

/**
 * .what = decrypt ciphertext with an age identity
 * .why = enables manifest decryption with recipient's private key
 *
 * .note = identity is the age secret key (AGE-SECRET-KEY-...)
 * .note = for passphrase-protected ssh keys: identity is SSH_KEY_PATH:$path
 *         and decryption shells out to age CLI (uses ssh-agent)
 * .note = accepts ascii-armored or binary ciphertext
 */
export const decryptWithIdentity = async (input: {
  ciphertext: string | Uint8Array;
  identity: string;
}): Promise<string> => {
  // check if identity is an ssh key path marker
  if (input.identity.startsWith(SSH_KEY_PATH_MARKER)) {
    const sshKeyPath = input.identity.slice(SSH_KEY_PATH_MARKER.length);
    return decryptWithAgeCLI({ ciphertext: input.ciphertext, sshKeyPath });
  }

  // decode armor if needed
  const ciphertextBytes =
    typeof input.ciphertext === 'string'
      ? age.armor.decode(input.ciphertext)
      : input.ciphertext;

  // create decrypter and add identity
  const decrypter = new age.Decrypter();
  decrypter.addIdentity(input.identity);

  // decrypt
  const plaintext = await decrypter.decrypt(ciphertextBytes, 'text');
  return plaintext;
};

/**
 * .what = encrypt plaintext via age CLI with multiple recipients
 * .why = produces ssh-ed25519 stanzas for ssh key recipients
 *
 * .note = age CLI with ssh pubkey recipients produces ssh-ed25519 stanzas
 * .note = these stanzas match age CLI decrypt with ssh key identity
 * .note = required for passphrase-protected ssh keys (cipher-aware path)
 */
const encryptWithAgeCLI = (input: {
  plaintext: string;
  recipients: KeyrackKeyRecipient[];
}): string => {
  // write plaintext to temp file
  const inputPath = join(tmpdir(), `keyrack-encrypt-${Date.now()}.txt`);
  const outputPath = join(tmpdir(), `keyrack-encrypt-${Date.now()}.age`);
  writeFileSync(inputPath, input.plaintext, 'utf8');

  try {
    // build age command with all recipients
    // age -e -R <(echo "ssh-ed25519 AAAA...") -R <(echo "age1...") -o output input
    const recipientArgs = input.recipients
      .map((r) => {
        // for ssh recipients: use raw pubkey (produces ssh-ed25519 stanza)
        // for age recipients: use age1... pubkey (produces X25519 stanza)
        const pubkey = r.mech === 'ssh' ? r.pubkey : r.pubkey;
        return `-r "${pubkey}"`;
      })
      .join(' ');

    const command = `age -e -a ${recipientArgs} -o "${outputPath}" "${inputPath}"`;
    execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // read armored output
    const ciphertext = readFileSync(outputPath, 'utf8');
    return ciphertext;
  } finally {
    // cleanup temp files
    try {
      unlinkSync(inputPath);
    } catch {
      // ignore cleanup errors
    }
    try {
      unlinkSync(outputPath);
    } catch {
      // ignore cleanup errors
    }
  }
};

/**
 * .what = decrypt ciphertext via age CLI with ssh key
 * .why = handles passphrase-protected ssh keys via ssh-agent
 *
 * .note = age CLI uses ssh-agent for passphrase-protected keys
 * .note = writes ciphertext to temp file, invokes age -d, cleans up
 */
const decryptWithAgeCLI = (input: {
  ciphertext: string | Uint8Array;
  sshKeyPath: string;
}): string => {
  // write ciphertext to temp file
  const tempPath = join(tmpdir(), `keyrack-decrypt-${Date.now()}.age`);
  const ciphertextStr =
    typeof input.ciphertext === 'string'
      ? input.ciphertext
      : Buffer.from(input.ciphertext).toString('utf8');
  writeFileSync(tempPath, ciphertextStr, 'utf8');

  try {
    // invoke age CLI for decryption
    // age -d -i $sshKeyPath $tempPath
    const plaintext = execSync(
      `age -d -i "${input.sshKeyPath}" "${tempPath}"`,
      {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    return plaintext;
  } finally {
    // cleanup temp file
    try {
      unlinkSync(tempPath);
    } catch {
      // ignore cleanup errors
    }
  }
};

/**
 * .what = generate a new age identity and recipient pair
 * .why = enables keyrack init to create a new recipient key
 *
 * .note = identity is private (AGE-SECRET-KEY-...)
 * .note = recipient is public (age1...)
 */
export const generateAgeKeyPair = async (): Promise<{
  identity: string;
  recipient: string;
}> => {
  const identity = await age.generateIdentity();
  const recipient = await age.identityToRecipient(identity);
  return { identity, recipient };
};
