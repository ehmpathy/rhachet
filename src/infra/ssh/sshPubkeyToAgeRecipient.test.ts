import { given, then, when } from 'test-fns';

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
      then('it returns an age1... prefixed string', () => {
        const recipient = sshPubkeyToAgeRecipient({ pubkey: pubkeyContent });
        expect(recipient).toMatch(/^age1[a-z0-9]+$/);
      });

      then('recipient is deterministic for the same pubkey', () => {
        const recipient1 = sshPubkeyToAgeRecipient({ pubkey: pubkeyContent });
        const recipient2 = sshPubkeyToAgeRecipient({ pubkey: pubkeyContent });
        expect(recipient1).toEqual(recipient2);
      });
    });
  });

  given('[case2] a pubkey with comment', () => {
    const pubkeyContent = readFileSync(TEST_SSH_PUBKEY_PATH, 'utf-8').trim();
    const pubkeyWithComment = `${pubkeyContent} my-laptop`;

    when('[t0] sshPubkeyToAgeRecipient is called', () => {
      then('it ignores the comment and returns valid recipient', () => {
        const recipientNoComment = sshPubkeyToAgeRecipient({
          pubkey: pubkeyContent,
        });
        const recipientWithComment = sshPubkeyToAgeRecipient({
          pubkey: pubkeyWithComment,
        });
        expect(recipientWithComment).toEqual(recipientNoComment);
      });
    });
  });

  given('[case3] an invalid key type', () => {
    const rsaPubkey = 'ssh-rsa AAAA... test';

    when('[t0] sshPubkeyToAgeRecipient is called', () => {
      then('it throws an error about unsupported key type', () => {
        expect(() => sshPubkeyToAgeRecipient({ pubkey: rsaPubkey })).toThrow(
          /only ed25519 keys supported/,
        );
      });
    });
  });

  given('[case4] malformed pubkey', () => {
    const malformedPubkey = 'not-a-valid-key';

    when('[t0] sshPubkeyToAgeRecipient is called', () => {
      then('it throws an error about invalid format', () => {
        expect(() =>
          sshPubkeyToAgeRecipient({ pubkey: malformedPubkey }),
        ).toThrow(/invalid ssh pubkey format/);
      });
    });
  });
});
