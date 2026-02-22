import { getError, given, then, when } from 'test-fns';

import { withTempHome } from '@src/.test/infra/withTempHome';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initKeyrack } from './initKeyrack';

// test ssh key paths
const TEST_SSH_KEY_DIR = join(__dirname, '../../.test/assets/keyrack/ssh');
const TEST_SSH_PRIKEY_PATH = join(TEST_SSH_KEY_DIR, 'test_key_ed25519');
const TEST_SSH_PUBKEY_PATH = join(TEST_SSH_KEY_DIR, 'test_key_ed25519.pub');

describe('initKeyrack', () => {
  const tempHome = withTempHome({ name: 'initKeyrack' });

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  beforeEach(() => {
    // clear session identity between tests
    daoKeyrackHostManifest.setSessionIdentity(null);
  });

  given('[case1] explicit pubkey path (private key path)', () => {
    when('[t0] initKeyrack called with pubkey path', () => {
      then('creates manifest file', async () => {
        const result = await initKeyrack({
          owner: 'test-explicit-prikey',
          pubkey: TEST_SSH_PRIKEY_PATH,
        });
        expect(existsSync(result.host.manifestPath)).toBe(true);
      });

      then('manifest file is encrypted', async () => {
        const result = await initKeyrack({
          owner: 'test-explicit-encrypted',
          pubkey: TEST_SSH_PRIKEY_PATH,
        });
        const content = readFileSync(result.host.manifestPath, 'utf8');
        expect(content).toMatch(/^-----BEGIN AGE ENCRYPTED FILE-----/);
      });

      then('returns owner as specified', async () => {
        const result = await initKeyrack({
          owner: 'test-owner-explicit',
          pubkey: TEST_SSH_PRIKEY_PATH,
        });
        expect(result.host.owner).toBe('test-owner-explicit');
      });

      then(
        'recipient has mech: age (passwordless key → npm library path)',
        async () => {
          const result = await initKeyrack({
            owner: 'test-mech-explicit',
            pubkey: TEST_SSH_PRIKEY_PATH,
          });
          // cipher-aware: passwordless key (cipher: none) → convert to age1... → mech: 'age'
          expect(result.host.recipient.mech).toBe('age');
        },
      );

      then(
        'recipient pubkey starts with age1 (converted from ssh)',
        async () => {
          const result = await initKeyrack({
            owner: 'test-pubkey-explicit',
            pubkey: TEST_SSH_PRIKEY_PATH,
          });
          // cipher-aware: passwordless key → ssh pubkey converted to native age recipient
          expect(result.host.recipient.pubkey).toMatch(/^age1/);
        },
      );
    });
  });

  given('[case2] explicit pubkey path (.pub file)', () => {
    when('[t0] initKeyrack called with .pub path', () => {
      then('extracts pubkey from .pub file and converts to age1', async () => {
        const result = await initKeyrack({
          owner: 'test-pubfile',
          pubkey: TEST_SSH_PUBKEY_PATH,
        });
        // cipher-aware: passwordless key → ssh pubkey converted to native age recipient
        expect(result.host.recipient.pubkey).toMatch(/^age1/);
        expect(result.host.recipient.mech).toBe('age');
      });

      then('creates manifest at correct path', async () => {
        const result = await initKeyrack({
          owner: 'test-pubfile-manifest',
          pubkey: TEST_SSH_PUBKEY_PATH,
        });
        expect(result.host.manifestPath).toContain(
          'keyrack.host.test-pubfile-manifest.age',
        );
        expect(existsSync(result.host.manifestPath)).toBe(true);
      });
    });
  });

  given('[case3] default ssh key discovery', () => {
    when('[t0] initKeyrack called without pubkey', () => {
      then(
        'finds ssh key in ~/.ssh/id_ed25519 and converts to age1',
        async () => {
          // copy test key to temp home's .ssh dir
          const sshDir = join(tempHome.path, '.ssh');
          mkdirSync(sshDir, { recursive: true });
          copyFileSync(TEST_SSH_PRIKEY_PATH, join(sshDir, 'id_ed25519'));
          copyFileSync(TEST_SSH_PUBKEY_PATH, join(sshDir, 'id_ed25519.pub'));

          const result = await initKeyrack({ owner: 'test-default-discovery' });
          // cipher-aware: passwordless test key → convert to age1... → mech: 'age'
          expect(result.host.recipient.mech).toBe('age');
          expect(result.host.recipient.pubkey).toMatch(/^age1/);
        },
      );
    });
  });

  given('[case4] no ssh key found', () => {
    when('[t0] initKeyrack called without pubkey and no default key', () => {
      then('throws helpful error', async () => {
        // use a fresh temp home with no ssh keys
        const emptyHome = withTempHome({ name: 'initKeyrack-empty' });
        emptyHome.setup();

        try {
          const error = await getError(initKeyrack({ owner: 'test-no-key' }));
          expect(error).toBeDefined();
          expect(error?.message).toContain('no ed25519 key found');
        } finally {
          emptyHome.teardown();
        }
      });
    });
  });

  given('[case5] pubkey value provided (not path)', () => {
    when('[t0] initKeyrack called with pubkey value', () => {
      then('throws error (path required for init)', async () => {
        const error = await getError(
          initKeyrack({
            owner: 'test-pubkey-value',
            pubkey: 'ssh-ed25519 AAAA...',
          }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('private key path required');
      });
    });
  });

  given('[case6] already initialized (idempotent)', () => {
    when('[t0] initKeyrack called again', () => {
      then('returns same recipient (findsert)', async () => {
        const first = await initKeyrack({
          owner: 'idem-test-1',
          pubkey: TEST_SSH_PRIKEY_PATH,
          label: 'first-label',
        });
        const second = await initKeyrack({
          owner: 'idem-test-1',
          pubkey: TEST_SSH_PRIKEY_PATH,
          label: 'second-label',
        });
        expect(second.host.recipient.pubkey).toEqual(
          first.host.recipient.pubkey,
        );
      });

      then('preserves original label', async () => {
        const first = await initKeyrack({
          owner: 'idem-test-2',
          pubkey: TEST_SSH_PRIKEY_PATH,
          label: 'first-label',
        });
        const second = await initKeyrack({
          owner: 'idem-test-2',
          pubkey: TEST_SSH_PRIKEY_PATH,
          label: 'second-label',
        });
        expect(second.host.recipient.label).toEqual('first-label');
      });
    });
  });

  given('[case7] explicit owner (mechanic)', () => {
    when('[t0] initKeyrack with owner=mechanic', () => {
      then('creates manifest at keyrack.host.mechanic.age', async () => {
        const result = await initKeyrack({
          owner: 'mechanic',
          pubkey: TEST_SSH_PRIKEY_PATH,
        });
        expect(result.host.manifestPath).toContain('keyrack.host.mechanic.age');
        expect(existsSync(result.host.manifestPath)).toBe(true);
      });

      then('returns owner: mechanic', async () => {
        const result = await initKeyrack({
          owner: 'mechanic',
          pubkey: TEST_SSH_PRIKEY_PATH,
        });
        expect(result.host.owner).toBe('mechanic');
      });
    });
  });

  given('[case8] null owner (default)', () => {
    when('[t0] initKeyrack with no owner', () => {
      then('creates manifest at keyrack.host.age (no suffix)', async () => {
        // copy test key to temp home's .ssh dir
        const sshDir = join(tempHome.path, '.ssh');
        mkdirSync(sshDir, { recursive: true });
        copyFileSync(TEST_SSH_PRIKEY_PATH, join(sshDir, 'id_ed25519'));
        copyFileSync(TEST_SSH_PUBKEY_PATH, join(sshDir, 'id_ed25519.pub'));

        const result = await initKeyrack({});
        expect(result.host.manifestPath).toMatch(/keyrack\.host\.age$/);
        expect(result.host.owner).toBeNull();
      });
    });
  });

  given('[case9] multiple owners on same machine', () => {
    when('[t0] init for mechanic then foreman', () => {
      then('creates separate manifest files', async () => {
        const mechanic = await initKeyrack({
          owner: 'mechanic',
          pubkey: TEST_SSH_PRIKEY_PATH,
        });
        const foreman = await initKeyrack({
          owner: 'foreman',
          pubkey: TEST_SSH_PRIKEY_PATH,
        });

        expect(mechanic.host.manifestPath).not.toEqual(
          foreman.host.manifestPath,
        );
        expect(existsSync(mechanic.host.manifestPath)).toBe(true);
        expect(existsSync(foreman.host.manifestPath)).toBe(true);
      });
    });
  });

  given('[case10] custom label', () => {
    when('[t0] initKeyrack with label', () => {
      then('recipient has custom label', async () => {
        const result = await initKeyrack({
          owner: 'label-test',
          pubkey: TEST_SSH_PRIKEY_PATH,
          label: 'my-laptop',
        });
        expect(result.host.recipient.label).toEqual('my-laptop');
      });
    });
  });

  given('[case11] default label', () => {
    when('[t0] initKeyrack without label', () => {
      then('recipient has label: default', async () => {
        const result = await initKeyrack({
          owner: 'default-label-test',
          pubkey: TEST_SSH_PRIKEY_PATH,
        });
        expect(result.host.recipient.label).toEqual('default');
      });
    });
  });
});
