import { getError, given, then, when } from 'test-fns';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sshPubkeyToAgeRecipient } from './sshPubkeyToAgeRecipient';

// test ssh key paths
const TEST_SSH_KEY_DIR = join(__dirname, '../../.test/assets/keyrack/ssh');
const TEST_SSH_PUBKEY_PATH = join(TEST_SSH_KEY_DIR, 'test_key_ed25519.pub');

describe('sshPubkeyToAgeRecipient', () => {
  given('[case1] a valid ssh-ed25519 public key', () => {
    const pubkeyContent = readFileSync(TEST_SSH_PUBKEY_PATH, 'utf-8').trim();

    when('[t0] sshPubkeyToAgeRecipient is called', () => {
      then('it returns an age1... prefixed string', async () => {
        const recipient = await sshPubkeyToAgeRecipient({
          pubkey: pubkeyContent,
        });
        expect(recipient).toMatch(/^age1[a-z0-9]+$/);

        // pin the caller-visible recipient VERBATIM — the ed25519->x25519->bech32 derivation is
        // deterministic for a fixed fixture pubkey, so a @noble/curves or @scure/base upgrade that
        // shifts the crypto shape surfaces byte-for-byte in this snapshot diff.
        expect(recipient).toMatchSnapshot();
      });

      then('recipient is deterministic for the same pubkey', async () => {
        const recipient1 = await sshPubkeyToAgeRecipient({
          pubkey: pubkeyContent,
        });
        const recipient2 = await sshPubkeyToAgeRecipient({
          pubkey: pubkeyContent,
        });
        expect(recipient1).toEqual(recipient2);
      });
    });
  });

  given('[case2] a pubkey with comment', () => {
    const pubkeyContent = readFileSync(TEST_SSH_PUBKEY_PATH, 'utf-8').trim();
    const pubkeyWithComment = `${pubkeyContent} my-laptop`;

    when('[t0] sshPubkeyToAgeRecipient is called', () => {
      then('it ignores the comment and returns valid recipient', async () => {
        const recipientNoComment = await sshPubkeyToAgeRecipient({
          pubkey: pubkeyContent,
        });
        const recipientWithComment = await sshPubkeyToAgeRecipient({
          pubkey: pubkeyWithComment,
        });
        expect(recipientWithComment).toEqual(recipientNoComment);
      });
    });
  });

  given('[case3] an invalid key type', () => {
    const rsaPubkey = 'ssh-rsa AAAA... test';

    when('[t0] sshPubkeyToAgeRecipient is called', () => {
      then('it throws an error about unsupported key type', async () => {
        const error = await getError(
          sshPubkeyToAgeRecipient({ pubkey: rsaPubkey }),
        );
        expect(error.message).toMatch(/only ed25519 keys supported/);

        // pin the caller-visible NEGATIVE-path error message (deterministic)
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case4] malformed pubkey', () => {
    const malformedPubkey = 'not-a-valid-key';

    when('[t0] sshPubkeyToAgeRecipient is called', () => {
      then('it throws an error about invalid format', async () => {
        const error = await getError(
          sshPubkeyToAgeRecipient({ pubkey: malformedPubkey }),
        );
        expect(error.message).toMatch(/invalid ssh pubkey format/);

        // pin the caller-visible EDGE-path error message (deterministic)
        expect(error.message).toMatchSnapshot();
      });
    });
  });
});
