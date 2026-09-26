import { given, then, when } from 'test-fns';

import {
  decryptWithIdentity,
  encryptToRecipients,
  generateAgeKeyPair,
} from './ageRecipientCrypto';

describe('ageRecipientCrypto', () => {
  given('[case1] generateAgeKeyPair', () => {
    when('[t0] called', () => {
      then('returns identity and recipient', async () => {
        const keyPair = await generateAgeKeyPair();
        expect(keyPair.identity).toMatch(/^AGE-SECRET-KEY-/);
        expect(keyPair.recipient).toMatch(/^age1/);
      });

      then('identity and recipient are linked', async () => {
        const keyPair = await generateAgeKeyPair();

        // encrypt with recipient, decrypt with identity
        const plaintext = 'test secret';
        const ciphertext = await encryptToRecipients({
          plaintext,
          recipients: [
            {
              mech: 'age',
              pubkey: keyPair.recipient,
              label: 'test',
              addedAt: '',
            },
          ],
        });
        const decrypted = await decryptWithIdentity({
          ciphertext,
          identity: keyPair.identity,
        });
        expect(decrypted).toEqual(plaintext);
      });
    });
  });

  given('[case2] encryptToRecipients', () => {
    when('[t0] no recipients provided', () => {
      then('throws error', async () => {
        await expect(
          encryptToRecipients({
            plaintext: 'test',
            recipients: [],
          }),
        ).rejects.toThrow('no recipients provided for encryption');
      });
    });

    when('[t1] unsupported recipient mech', () => {
      then('throws error', async () => {
        await expect(
          encryptToRecipients({
            plaintext: 'test',
            recipients: [
              {
                mech: 'yubikey' as unknown as 'age',
                pubkey: 'age1yubikey1...',
                label: 'test',
                addedAt: '',
              },
            ],
          }),
        ).rejects.toThrow("recipient mech 'yubikey' not supported");
      });
    });

    when('[t2] valid age recipient', () => {
      then('returns armored ciphertext', async () => {
        const keyPair = await generateAgeKeyPair();
        const ciphertext = await encryptToRecipients({
          plaintext: 'test secret',
          recipients: [
            {
              mech: 'age',
              pubkey: keyPair.recipient,
              label: 'test',
              addedAt: '',
            },
          ],
        });

        // armored ciphertext starts with age header and ends with footer
        expect(ciphertext).toMatch(/^-----BEGIN AGE ENCRYPTED FILE-----/);
        expect(ciphertext).toContain('-----END AGE ENCRYPTED FILE-----');
      });
    });

    when('[t3] multiple recipients', () => {
      then('all recipients can decrypt', async () => {
        const keyPair1 = await generateAgeKeyPair();
        const keyPair2 = await generateAgeKeyPair();
        const plaintext = 'shared secret';

        const ciphertext = await encryptToRecipients({
          plaintext,
          recipients: [
            {
              mech: 'age',
              pubkey: keyPair1.recipient,
              label: 'key1',
              addedAt: '',
            },
            {
              mech: 'age',
              pubkey: keyPair2.recipient,
              label: 'key2',
              addedAt: '',
            },
          ],
        });

        // both identities can decrypt
        const decrypted1 = await decryptWithIdentity({
          ciphertext,
          identity: keyPair1.identity,
        });
        const decrypted2 = await decryptWithIdentity({
          ciphertext,
          identity: keyPair2.identity,
        });

        expect(decrypted1).toEqual(plaintext);
        expect(decrypted2).toEqual(plaintext);
      });
    });
  });

  given('[case3] decryptWithIdentity', () => {
    when('[t0] wrong identity', () => {
      then('throws error', async () => {
        const keyPair1 = await generateAgeKeyPair();
        const keyPair2 = await generateAgeKeyPair();

        const ciphertext = await encryptToRecipients({
          plaintext: 'test',
          recipients: [
            {
              mech: 'age',
              pubkey: keyPair1.recipient,
              label: 'test',
              addedAt: '',
            },
          ],
        });

        // decrypt with wrong identity should fail
        await expect(
          decryptWithIdentity({
            ciphertext,
            identity: keyPair2.identity,
          }),
        ).rejects.toThrow();
      });
    });

    when('[t1] valid ciphertext and identity', () => {
      then('returns original plaintext', async () => {
        const keyPair = await generateAgeKeyPair();
        const original = 'my secret message\nwith newlines\nand unicode: 🐢';

        const ciphertext = await encryptToRecipients({
          plaintext: original,
          recipients: [
            {
              mech: 'age',
              pubkey: keyPair.recipient,
              label: 'test',
              addedAt: '',
            },
          ],
        });

        const decrypted = await decryptWithIdentity({
          ciphertext,
          identity: keyPair.identity,
        });

        expect(decrypted).toEqual(original);
      });
    });
  });
});
