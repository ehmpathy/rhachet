import { getError, given, then, when } from 'test-fns';

import { asAgeRecipientFromSshPubkey } from './asAgeRecipientFromSshPubkey';

// a sample ssh-ed25519 pubkey, inlined so this stays a pure unit test of a pure
// transformer — no filesystem read (rule.forbid.unit.remote-boundaries). the
// value is the same key kept at .test/assets/keyrack/ssh/test_key_ed25519.pub
const TEST_SSH_PUBKEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFLMJlbDd7KDDtq3f7JIROqYbI2jmEe8cWYSHo7hHo6K keyrack-test-key';

describe('asAgeRecipientFromSshPubkey', () => {
  given('[case1] a valid ssh-ed25519 public key', () => {
    const pubkeyContent = TEST_SSH_PUBKEY;

    when('[t0] asAgeRecipientFromSshPubkey is called', () => {
      then('it returns an age1... prefixed string', () => {
        const recipient = asAgeRecipientFromSshPubkey({
          pubkey: pubkeyContent,
        });
        expect(recipient).toMatch(/^age1[a-z0-9]+$/);
      });

      then('recipient is deterministic for the same pubkey', () => {
        const recipient1 = asAgeRecipientFromSshPubkey({
          pubkey: pubkeyContent,
        });
        const recipient2 = asAgeRecipientFromSshPubkey({
          pubkey: pubkeyContent,
        });
        expect(recipient1).toEqual(recipient2);
      });
    });
  });

  given('[case2] a pubkey with comment', () => {
    const pubkeyContent = TEST_SSH_PUBKEY;
    const pubkeyWithComment = `${pubkeyContent} my-laptop`;

    when('[t0] asAgeRecipientFromSshPubkey is called', () => {
      then('it ignores the comment and returns valid recipient', () => {
        const recipientNoComment = asAgeRecipientFromSshPubkey({
          pubkey: pubkeyContent,
        });
        const recipientWithComment = asAgeRecipientFromSshPubkey({
          pubkey: pubkeyWithComment,
        });
        expect(recipientWithComment).toEqual(recipientNoComment);
      });
    });
  });

  given('[case3] an invalid key type', () => {
    const rsaPubkey = 'ssh-rsa AAAA... test';

    when('[t0] asAgeRecipientFromSshPubkey is called', () => {
      then('it throws, and the user-visible text is pinned', () => {
        const error = getError(() =>
          asAgeRecipientFromSshPubkey({ pubkey: rsaPubkey }),
        );
        expect(error.message).toContain('only ed25519 keys supported');
        // pin the exact text so a reword cannot drift the surfaced message
        expect(error.message).toMatchSnapshot('wrong-key-type-message');
      });
    });
  });

  given('[case4] malformed pubkey', () => {
    const malformedPubkey = 'not-a-valid-key';

    when('[t0] asAgeRecipientFromSshPubkey is called', () => {
      then('it throws, and the user-visible text is pinned', () => {
        const error = getError(() =>
          asAgeRecipientFromSshPubkey({ pubkey: malformedPubkey }),
        );
        expect(error.message).toContain('invalid ssh pubkey format');
        // pin the exact text so a reword cannot drift the surfaced message
        expect(error.message).toMatchSnapshot('malformed-pubkey-message');
      });
    });
  });
});
