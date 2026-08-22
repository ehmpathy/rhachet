import { getError, given, then, when } from 'test-fns';

import {
  decryptWithIdentity,
  encryptToRecipients,
  generateAgeKeyPair,
} from './ageRecipientCrypto';

// age keypairs + ciphertext are RANDOM per run, so a verbatim snapshot would be non-deterministic.
// these utils mask the volatile body but keep the deterministic format anchors (prefix, armor
// header/footer), so a snapshot pins the CONTRACT SHAPE a caller sees — the reviewer vibechecks the
// output shape in the diff without a byte-unstable snapshot (rule.require.snapshots: snapshot +
// explicit assertions, both).
const maskBodyKeepPrefix = (value: string, prefix: string): string =>
  value.startsWith(prefix) ? `${prefix}<masked-body>` : `<unexpected:${value}>`;
const maskArmorBody = (armored: string): string => {
  const lines = armored.split('\n');
  const header = lines[0];
  const footer =
    lines[lines.length - 1] === ''
      ? lines[lines.length - 2]
      : lines[lines.length - 1];
  return `${header}\n<masked-armor-body>\n${footer}`;
};

// count the X25519 recipient stanzas in an armored age ciphertext. age adds one `-> X25519` stanza
// per age recipient, so the count is DETERMINISTIC and equals the recipient count — it distinguishes
// the multi-recipient armored SHAPE from the single-recipient one (whose masked-body snapshot is
// otherwise identical). the base64 armor is decoded to its binary header (up to the `--- ` mac line)
// and the stanzas counted there, so a payload byte that happened to spell the marker cannot inflate
// the count. a drift in per-recipient stanza structure/count surfaces in this snapshot.
const countRecipientStanzas = (armored: string): number => {
  const base64 = armored
    .split('\n')
    .filter((line) => !line.startsWith('-----'))
    .join('');
  const binary = Buffer.from(base64, 'base64').toString('latin1');
  const headerRegion = binary.split('\n--- ')[0] ?? '';
  return (headerRegion.match(/-> X25519 /g) ?? []).length;
};

/**
 * .what = jest unit coverage for the age crypto surface (generate / encrypt / decrypt)
 * .why  = age-encryption is pure-esm; the fix loads it lazily via importEsmOrRequire, whose jest
 *         branch require()s the dep (rhachet's jest config down-levels it to cjs). so jest CAN run
 *         real age crypto here — no mocks (rule.forbid.unit.remote-boundaries is honored: age is a
 *         pure in-process cryptographic lib, not a remote boundary). the real-node (prod) load-path
 *         (importEsmOrRequire's genuine import()) is proven separately by the acceptance clamp
 *         blackbox/sdk/keyrackEsmRequire.realnode.acceptance.test.ts.
 */
describe('ageRecipientCrypto', () => {
  given('[case1] generateAgeKeyPair', () => {
    when('[t0] called', () => {
      then('returns identity and recipient', async () => {
        const keyPair = await generateAgeKeyPair();
        expect(keyPair.identity).toMatch(/^AGE-SECRET-KEY-/);
        expect(keyPair.recipient).toMatch(/^age1/);

        // pin the caller-visible key-pair SHAPE (body masked; random per run)
        expect({
          identity: maskBodyKeepPrefix(keyPair.identity, 'AGE-SECRET-KEY-1'),
          recipient: maskBodyKeepPrefix(keyPair.recipient, 'age1'),
        }).toMatchSnapshot();
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
        const error = await getError(
          encryptToRecipients({
            plaintext: 'test',
            recipients: [],
          }),
        );
        expect(error.message).toContain(
          'no recipients provided for encryption',
        );

        // pin the caller-visible NEGATIVE-path error message (deterministic — our MalfunctionError)
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t1] unsupported recipient mech', () => {
      then('throws error', async () => {
        const error = await getError(
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
        );
        expect(error.message).toContain(
          "recipient mech 'yubikey' not supported",
        );

        // pin the caller-visible EDGE-path error message (deterministic — our MalfunctionError)
        expect(error.message).toMatchSnapshot();
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

        // pin the caller-visible armored-ciphertext SHAPE (body masked; random per run)
        expect(maskArmorBody(ciphertext)).toMatchSnapshot();
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

        // pin the caller-visible MULTI-recipient armored SHAPE: two X25519 stanzas (one per
        // recipient — deterministic; distinguishes this from the single-recipient [t2] snapshot)
        // plus the masked armor wrapper. drift in stanza count/structure surfaces here.
        expect({
          recipientStanzaCount: countRecipientStanzas(ciphertext),
          armoredShape: maskArmorBody(ciphertext),
        }).toMatchSnapshot();
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
        const error = await getError(
          decryptWithIdentity({
            ciphertext,
            identity: keyPair2.identity,
          }),
        );
        expect(error).toBeInstanceOf(Error);

        // pin the NEGATIVE-path decrypt-failure SHAPE. the age-library message is version-volatile,
        // so it is masked to `<age-decrypt-error>`; what is pinned is the deterministic shape — a
        // real Error with a non-empty message surfaces (never a silent no-throw). a future
        // lazy-loaded age-shape change that stopped the throw, or emptied the message, breaks this.
        expect({
          isError: error instanceof Error,
          message: error.message ? '<age-decrypt-error>' : '<empty>',
        }).toMatchSnapshot();
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
