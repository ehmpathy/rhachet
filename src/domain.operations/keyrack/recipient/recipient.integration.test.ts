import { getError, given, then, when } from 'test-fns';

import { assertDepAgeIsInstalled } from '@src/.test/infra/assertDepAgeIsInstalled';
import { withTempHome } from '@src/.test/infra/withTempHome';
import { generateAgeKeyPair } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { initKeyrack } from '@src/domain.operations/keyrack/initKeyrack';

import { join } from 'node:path';
import { delKeyrackRecipient } from './delKeyrackRecipient';
import { getKeyrackRecipients } from './getKeyrackRecipients';
import { setKeyrackRecipient } from './setKeyrackRecipient';

// fail-fast: require age cli (--stanza ssh tests need it)
assertDepAgeIsInstalled();

// test ssh key paths
const TEST_SSH_KEY_DIR = join(__dirname, '../../../.test/assets/keyrack/ssh');
const TEST_SSH_PUBKEY_PATH = join(TEST_SSH_KEY_DIR, 'test_key_ed25519.pub');
const TEST_SSH_PRIKEY_PATH = join(TEST_SSH_KEY_DIR, 'test_key_ed25519');

describe('recipient operations', () => {
  const tempHome = withTempHome({ name: 'recipient-ops' });

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  beforeEach(() => {
    // clear session identity between tests
    // session identity removed - use _testIdentity in get()
  });

  describe('setKeyrackRecipient', () => {
    given('[case1] keyrack initialized', () => {
      when('[t0] add a valid recipient', () => {
        then('adds recipient to manifest', async () => {
          // init keyrack first
          await initKeyrack({
            owner: 'set-test-1',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });

          // generate a second keypair
          const { recipient: pubkey2 } = await generateAgeKeyPair();

          // add second recipient
          const recipient = await setKeyrackRecipient({
            owner: 'set-test-1',
            pubkey: pubkey2,
            label: 'backup',
            stanza: null,
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          expect(recipient.mech).toBe('age');
          expect(recipient.pubkey).toBe(pubkey2);
          expect(recipient.label).toBe('backup');
        });

        then('manifest has two recipients after add', async () => {
          await initKeyrack({
            owner: 'set-test-2',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });
          const { recipient: pubkey2 } = await generateAgeKeyPair();

          await setKeyrackRecipient({
            owner: 'set-test-2',
            pubkey: pubkey2,
            label: 'backup',
            stanza: null,
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          const recipients = await getKeyrackRecipients({
            owner: 'set-test-2',
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });
          expect(recipients).toHaveLength(2);
        });
      });

      when('[t1] add duplicate label', () => {
        then('throws error', async () => {
          await initKeyrack({
            owner: 'dup-test',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });
          const { recipient: pubkey2 } = await generateAgeKeyPair();

          await setKeyrackRecipient({
            owner: 'dup-test',
            pubkey: pubkey2,
            label: 'backup',
            stanza: null,
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          const { recipient: pubkey3 } = await generateAgeKeyPair();
          const error = await getError(
            setKeyrackRecipient({
              owner: 'dup-test',
              pubkey: pubkey3,
              label: 'backup', // duplicate
              stanza: null,
              prikeys: [TEST_SSH_PRIKEY_PATH],
            }),
          );

          expect(error).toBeDefined();
          expect(error?.message).toContain('already exists');
        });
      });

      when('[t2] add ssh pubkey', () => {
        then('converts to age format (enables npm library path)', async () => {
          await initKeyrack({
            owner: 'ssh-test',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });

          // read the test pubkey content
          const { readFileSync } = await import('node:fs');
          const sshPubkey = readFileSync(TEST_SSH_PUBKEY_PATH, 'utf8').trim();

          const recipient = await setKeyrackRecipient({
            owner: 'ssh-test',
            pubkey: sshPubkey,
            label: 'ssh-key',
            stanza: null,
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          // ssh pubkey is converted to age format by default
          expect(recipient.mech).toBe('age');
          expect(recipient.pubkey).toMatch(/^age1/);
          expect(recipient.label).toBe('ssh-key');
        });
      });

      when('[t3] add invalid pubkey', () => {
        then('throws error', async () => {
          await initKeyrack({
            owner: 'invalid-test',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });

          const error = await getError(
            setKeyrackRecipient({
              owner: 'invalid-test',
              pubkey: 'invalid-pubkey-format',
              label: 'invalid',
              stanza: null,
              prikeys: [TEST_SSH_PRIKEY_PATH],
            }),
          );

          expect(error).toBeDefined();
          expect(error?.message).toContain('pubkey must be age');
        });
      });

      when('[t4] add ssh pubkey with --stanza ssh', () => {
        then('forces mech: ssh (ssh-keygen -p prevention flow)', async () => {
          await initKeyrack({
            owner: 'stanza-ssh-test',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });

          // read the test pubkey content
          const { readFileSync } = await import('node:fs');
          const sshPubkey = readFileSync(TEST_SSH_PUBKEY_PATH, 'utf8').trim();

          // add with --stanza ssh to force ssh-ed25519 stanza format
          const recipient = await setKeyrackRecipient({
            owner: 'stanza-ssh-test',
            pubkey: sshPubkey,
            label: 'ssh-stanza-key',
            stanza: 'ssh',
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          // should force mech: 'ssh' (not converted to age1...)
          expect(recipient.mech).toBe('ssh');
          expect(recipient.pubkey).toMatch(/^ssh-ed25519/);
          expect(recipient.label).toBe('ssh-stanza-key');
        });
      });

      when('[t5] --stanza ssh with age pubkey', () => {
        then('throws error (requires ssh pubkey)', async () => {
          await initKeyrack({
            owner: 'stanza-age-test',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });

          // generate an age keypair
          const { recipient: agePubkey } = await generateAgeKeyPair();

          // attempt to add age pubkey with --stanza ssh
          const error = await getError(
            setKeyrackRecipient({
              owner: 'stanza-age-test',
              pubkey: agePubkey,
              label: 'age-key',
              stanza: 'ssh',
              prikeys: [TEST_SSH_PRIKEY_PATH],
            }),
          );

          expect(error).toBeDefined();
          expect(error?.message).toContain('--stanza ssh requires ssh pubkey');
        });
      });
    });

    given('[case2] keyrack not initialized', () => {
      when('[t0] attempt to add recipient', () => {
        then('throws error', async () => {
          const error = await getError(
            setKeyrackRecipient({
              owner: 'nonexistent',
              pubkey: 'age1...',
              label: 'test',
              stanza: null,
              prikeys: [TEST_SSH_PRIKEY_PATH],
            }),
          );

          expect(error).toBeDefined();
          expect(error?.message).toContain('manifest not found');
        });
      });
    });
  });

  describe('getKeyrackRecipients', () => {
    given('[case1] keyrack initialized', () => {
      when('[t0] get recipients', () => {
        then('returns recipient list', async () => {
          await initKeyrack({
            owner: 'get-test-1',
            label: 'primary',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });

          const recipients = await getKeyrackRecipients({
            owner: 'get-test-1',
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          expect(recipients).toHaveLength(1);
          expect(recipients[0]?.label).toBe('primary');
          // cipher-aware: passwordless test key (cipher: none) → converts to age1... → mech: 'age'
          expect(recipients[0]?.mech).toBe('age');
        });
      });

      when('[t1] multiple recipients', () => {
        then('returns all recipients', async () => {
          await initKeyrack({
            owner: 'get-test-2',
            label: 'primary',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });
          const { recipient: pubkey2 } = await generateAgeKeyPair();

          await setKeyrackRecipient({
            owner: 'get-test-2',
            pubkey: pubkey2,
            label: 'backup',
            stanza: null,
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          const recipients = await getKeyrackRecipients({
            owner: 'get-test-2',
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          expect(recipients).toHaveLength(2);
          const labels = recipients.map((r) => r.label);
          expect(labels).toContain('primary');
          expect(labels).toContain('backup');
        });
      });
    });

    given('[case2] keyrack not initialized', () => {
      when('[t0] attempt to get recipients', () => {
        then('throws error', async () => {
          const error = await getError(
            getKeyrackRecipients({ owner: 'nonexistent-get' }),
          );

          expect(error).toBeDefined();
          expect(error?.message).toContain('manifest not found');
        });
      });
    });
  });

  describe('delKeyrackRecipient', () => {
    given('[case1] keyrack has multiple recipients', () => {
      when('[t0] delete a recipient by label', () => {
        then('removes recipient from manifest', async () => {
          // init and add second recipient
          await initKeyrack({
            owner: 'del-test-1',
            label: 'primary',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });
          const { recipient: pubkey2 } = await generateAgeKeyPair();
          await setKeyrackRecipient({
            owner: 'del-test-1',
            pubkey: pubkey2,
            label: 'backup',
            stanza: null,
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          // verify two recipients
          let recipients = await getKeyrackRecipients({
            owner: 'del-test-1',
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });
          expect(recipients).toHaveLength(2);

          // delete backup
          await delKeyrackRecipient({
            owner: 'del-test-1',
            label: 'backup',
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          // verify one recipient
          recipients = await getKeyrackRecipients({
            owner: 'del-test-1',
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });
          expect(recipients).toHaveLength(1);
          expect(recipients[0]?.label).toBe('primary');
        });
      });

      when('[t1] delete nonexistent label', () => {
        then('throws error', async () => {
          await initKeyrack({
            owner: 'del-test-2',
            label: 'primary',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });
          const { recipient: pubkey2 } = await generateAgeKeyPair();
          await setKeyrackRecipient({
            owner: 'del-test-2',
            pubkey: pubkey2,
            label: 'backup',
            stanza: null,
            prikeys: [TEST_SSH_PRIKEY_PATH],
          });

          const error = await getError(
            delKeyrackRecipient({
              owner: 'del-test-2',
              label: 'nonexistent',
              prikeys: [TEST_SSH_PRIKEY_PATH],
            }),
          );

          expect(error).toBeDefined();
          expect(error?.message).toContain('not found');
        });
      });
    });

    given('[case2] keyrack has only one recipient', () => {
      when('[t0] attempt to delete last recipient', () => {
        then('throws error', async () => {
          await initKeyrack({
            owner: 'last-test',
            label: 'only-one',
            pubkey: TEST_SSH_PUBKEY_PATH,
          });

          const error = await getError(
            delKeyrackRecipient({
              owner: 'last-test',
              label: 'only-one',
              prikeys: [TEST_SSH_PRIKEY_PATH],
            }),
          );

          expect(error).toBeDefined();
          expect(error?.message).toContain('cannot remove last recipient');
        });
      });
    });

    given('[case3] keyrack not initialized', () => {
      when('[t0] attempt to delete recipient', () => {
        then('throws error', async () => {
          const error = await getError(
            delKeyrackRecipient({
              owner: 'nonexistent-del',
              label: 'test',
              prikeys: [TEST_SSH_PRIKEY_PATH],
            }),
          );

          expect(error).toBeDefined();
          expect(error?.message).toContain('manifest not found');
        });
      });
    });
  });
});
