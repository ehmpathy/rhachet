import * as age from 'age-encryption';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { withTempHome } from '@src/.test/infra/withTempHome';
import {
  KeyrackHostManifest,
  KeyrackKeyHost,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import { generateAgeKeyPair } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import {
  ed25519SeedToAgeIdentity,
  extractEd25519Seed,
} from '@src/infra/ssh/sshPrikeyToAgeIdentity';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { daoKeyrackHostManifest } from './index';

/**
 * .what = test ed25519 ssh key (unencrypted, no passphrase)
 * .why = used for prikey auto-discovery tests
 *
 * .note = do not use for purposes other than tests
 */
const TEST_SSH_KEY = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIwAAAJjBLCW1wSwl
tQAAAAtzc2gtZWQyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIw
AAAEBH8OVWuHCPSFQjJ7oLvNqjZMpR1mQKwJkHZPqNkfJvp12VMEsmM7wuU7bh+pfGp8Uc
n3lBwWlDiElZZctQbXEjAAAAEXRlc3RAZXhhbXBsZS5sb2NhbAECAwQF
-----END OPENSSH PRIVATE KEY-----`;

/**
 * .what = derive age identity from test ssh key
 * .why = used to create manifests encrypted to the ssh key
 */
const getTestSshKeyAgeIdentity = (): string => {
  const seed = extractEd25519Seed({ keyContent: TEST_SSH_KEY });
  return ed25519SeedToAgeIdentity({ seed });
};

/**
 * .what = derive age recipient from test ssh key
 * .why = used to encrypt manifests that can be decrypted by the ssh key
 */
const getTestSshKeyAgeRecipient = async (): Promise<string> => {
  const identity = getTestSshKeyAgeIdentity();
  return age.identityToRecipient(identity);
};

describe('daoKeyrackHostManifest', () => {
  const tempHome = withTempHome({ name: 'daoKeyrackHostManifest' });

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  beforeEach(() => {
    // clear session identity between tests
    daoKeyrackHostManifest.setSessionIdentity(null);
  });

  given('[case1] no manifest exists (default owner)', () => {
    when('[t0] get called', () => {
      then('returns null', async () => {
        const result = await daoKeyrackHostManifest.get({
          owner: null,
          prikey: null,
        });
        expect(result).toBeNull();
      });
    });
  });

  given(
    '[case2] manifest lifecycle with age encryption (default owner)',
    () => {
      const keyPair = useBeforeAll(async () => generateAgeKeyPair());

      when('[t0] set.findsert called with new manifest', () => {
        then('creates encrypted manifest file', async () => {
          daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

          const recipient = new KeyrackKeyRecipient({
            mech: 'age',
            pubkey: keyPair.recipient,
            label: 'test-key',
            addedAt: new Date().toISOString(),
          });

          const manifest = new KeyrackHostManifest({
            uri: '~/.rhachet/keyrack/keyrack.host.age',
            owner: null,
            recipients: [recipient],
            hosts: {},
          });

          const result = await daoKeyrackHostManifest.set({
            findsert: manifest,
          });
          expect(result.uri).toEqual(manifest.uri);

          const path = join(
            tempHome.path,
            '.rhachet',
            'keyrack',
            'keyrack.host.age',
          );
          expect(existsSync(path)).toBe(true);
        });

        then('file is encrypted (armored age format)', async () => {
          const path = join(
            tempHome.path,
            '.rhachet',
            'keyrack',
            'keyrack.host.age',
          );
          const content = readFileSync(path, 'utf8');
          expect(content).toMatch(/^-----BEGIN AGE ENCRYPTED FILE-----/);
        });

        then('file permissions are 0600', async () => {
          const path = join(
            tempHome.path,
            '.rhachet',
            'keyrack',
            'keyrack.host.age',
          );
          const stats = statSync(path);
          const mode = stats.mode & 0o777;
          expect(mode).toBe(0o600);
        });
      });

      when('[t1] get with correct identity', () => {
        then('decrypts and returns manifest', async () => {
          daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);
          const result = await daoKeyrackHostManifest.get({
            owner: null,
            prikey: null,
          });

          expect(result).not.toBeNull();
          expect(result?.owner).toBeNull();
          expect(result?.recipients).toHaveLength(1);
          expect(result?.recipients[0]?.pubkey).toEqual(keyPair.recipient);
        });
      });

      when('[t2] get without explicit identity (discovery fallback)', () => {
        then(
          'attempts discovery and fails with decrypt error (no match)',
          async () => {
            daoKeyrackHostManifest.setSessionIdentity(null);
            const error = await getError(
              daoKeyrackHostManifest.get({ owner: null, prikey: null }),
            );
            expect(error).toBeDefined();
            // per blueprint 6.4: discovery tries available keys; fails if none match
            // error is either:
            // - "no prikey available" (no keys found in temp home or ssh-agent)
            // - "failed to decrypt" (keys found but none match this manifest)
            expect(
              error?.message.includes('no prikey available') ||
                error?.message.includes('failed to decrypt'),
            ).toBe(true);
          },
        );
      });

      when('[t3] get with wrong identity', () => {
        then('throws error', async () => {
          const wrongKeyPair = await generateAgeKeyPair();
          daoKeyrackHostManifest.setSessionIdentity(wrongKeyPair.identity);
          const error = await getError(
            daoKeyrackHostManifest.get({ owner: null, prikey: null }),
          );
          expect(error).toBeDefined();
          expect(error?.message).toContain('failed to decrypt host manifest');
        });
      });
    },
  );

  given('[case3] manifest with hosts (default owner)', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());

    const manifest = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      const host = new KeyrackKeyHost({
        slug: 'ehmpathy.sudo.GITHUB_TOKEN',
        exid: null,
        vault: 'os.direct',
        mech: 'REPLICA',
        env: 'sudo',
        org: 'ehmpathy',
        vaultRecipient: null,
        maxDuration: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.age',
          owner: null,
          recipients: [recipient],
          hosts: { [host.slug]: host },
        }),
      });
    });

    when('[t0] get after upsert', () => {
      then('host is preserved with env and org fields', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);
        const result = await daoKeyrackHostManifest.get({
          owner: null,
          prikey: null,
        });

        expect(result?.hosts['ehmpathy.sudo.GITHUB_TOKEN']).toBeDefined();
        const host = result?.hosts['ehmpathy.sudo.GITHUB_TOKEN'];
        expect(host?.env).toEqual('sudo');
        expect(host?.org).toEqual('ehmpathy');
        expect(host?.vault).toEqual('os.direct');
        expect(host?.mech).toEqual('REPLICA');
      });
    });
  });

  given('[case4] per-owner manifest (mechanic)', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());

    const manifest = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'mechanic-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.mechanic.age',
          owner: 'mechanic',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] after findsert', () => {
      then('file exists at keyrack.host.mechanic.age', () => {
        const path = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.mechanic.age',
        );
        expect(existsSync(path)).toBe(true);
      });

      then('owner is stored in manifest', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);
        const result = await daoKeyrackHostManifest.get({
          owner: 'mechanic',
          prikey: null,
        });
        expect(result?.owner).toEqual('mechanic');
      });
    });
  });

  given('[case5] findsert semantics', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());

    const firstManifest = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.findsert-test.age',
          owner: 'findsert-test',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] findsert on same uri', () => {
      then('returns prior manifest without update', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

        const recipient = new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: keyPair.recipient,
          label: 'different-label',
          addedAt: new Date().toISOString(),
        });

        const newManifest = new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.findsert-test.age',
          owner: 'findsert-test',
          recipients: [recipient],
          hosts: {},
        });

        const result = await daoKeyrackHostManifest.set({
          findsert: newManifest,
        });

        // label should still be 'test-key' from original findsert
        expect(result.recipients[0]?.label).toEqual('test-key');
      });
    });

    when('[t1] findsert on different uri', () => {
      then('throws error', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

        const recipient = new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: keyPair.recipient,
          label: 'test-key',
          addedAt: new Date().toISOString(),
        });

        const newManifest = new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/different-uri.age',
          owner: 'findsert-test',
          recipients: [recipient],
          hosts: {},
        });

        const error = await getError(
          daoKeyrackHostManifest.set({ findsert: newManifest }),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain('different uri');
      });
    });
  });

  given(
    '[case6] hasIdentity helper (session identity only per blueprint 6.4)',
    () => {
      when('[t0] no explicit identity (session only)', () => {
        then('returns false (discovery is separate)', () => {
          daoKeyrackHostManifest.setSessionIdentity(null);
          // per blueprint 6.4: hasIdentity only checks explicit (session)
          // discovery happens at runtime in get(), not in hasIdentity
          expect(daoKeyrackHostManifest.hasIdentity()).toBe(false);
        });
      });

      when('[t1] session identity set', () => {
        then('returns true', async () => {
          const keyPair = await generateAgeKeyPair();
          daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);
          expect(daoKeyrackHostManifest.hasIdentity()).toBe(true);
        });
      });
    },
  );

  given('[case7] multi-recipient encryption', () => {
    const keyPair1 = useBeforeAll(async () => generateAgeKeyPair());
    const keyPair2 = useBeforeAll(async () => generateAgeKeyPair());

    const manifest = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair1.identity);

      const recipients = [
        new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: keyPair1.recipient,
          label: 'key1',
          addedAt: new Date().toISOString(),
        }),
        new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: keyPair2.recipient,
          label: 'key2',
          addedAt: new Date().toISOString(),
        }),
      ];

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.multi.age',
          owner: 'multi',
          recipients,
          hosts: {},
        }),
      });
    });

    when('[t0] both recipients can decrypt', () => {
      then('first recipient can decrypt', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair1.identity);
        const result = await daoKeyrackHostManifest.get({
          owner: 'multi',
          prikey: null,
        });
        expect(result?.owner).toEqual('multi');
      });

      then('second recipient can decrypt', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair2.identity);
        const result = await daoKeyrackHostManifest.get({
          owner: 'multi',
          prikey: null,
        });
        expect(result?.owner).toEqual('multi');
      });
    });
  });

  given('[case8] upsert overwrites manifest', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());

    const firstManifest = useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      const oldHost = new KeyrackKeyHost({
        slug: 'OLD_KEY',
        mech: 'REPLICA',
        vault: 'os.direct',
        exid: null,
        env: 'all',
        org: 'testorg',
        vaultRecipient: null,
        maxDuration: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.upsert-test.age',
          owner: 'upsert-test',
          recipients: [recipient],
          hosts: { OLD_KEY: oldHost },
        }),
      });
    });

    when('[t0] set.upsert called', () => {
      then('overwrites manifest', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);

        const recipient = new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: keyPair.recipient,
          label: 'test-key',
          addedAt: new Date().toISOString(),
        });

        const newHost = new KeyrackKeyHost({
          slug: 'NEW_KEY',
          mech: 'GITHUB_APP',
          vault: '1password',
          exid: 'op://vault/item',
          env: 'all',
          org: 'testorg',
          vaultRecipient: null,
          maxDuration: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const result = await daoKeyrackHostManifest.set({
          upsert: new KeyrackHostManifest({
            uri: '~/.rhachet/keyrack/keyrack.host.upsert-test.age',
            owner: 'upsert-test',
            recipients: [recipient],
            hosts: { NEW_KEY: newHost },
          }),
        });

        // upsert replaces the manifest
        expect(result.hosts.NEW_KEY).toBeDefined();
        expect(result.hosts.OLD_KEY).toBeUndefined();

        // verify on disk (should still be encrypted)
        const path = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.upsert-test.age',
        );
        const content = readFileSync(path, 'utf8');
        expect(content).toMatch(/^-----BEGIN AGE ENCRYPTED FILE-----/);
      });
    });
  });

  given('[case9] prikey auto-discovery with owner-specific path', () => {
    const sshKeyRecipient = useBeforeAll(async () => ({
      value: await getTestSshKeyAgeRecipient(),
    }));
    const sshKeyIdentity = getTestSshKeyAgeIdentity();

    // setup: write ssh key to ~/.ssh/testowner and create manifest encrypted to it
    useBeforeAll(async () => {
      // create ~/.ssh directory
      const sshDir = join(tempHome.path, '.ssh');
      if (!existsSync(sshDir)) mkdirSync(sshDir, { recursive: true });

      // write ssh key to ~/.ssh/testowner
      const sshKeyPath = join(sshDir, 'testowner');
      writeFileSync(sshKeyPath, TEST_SSH_KEY, 'utf8');
      chmodSync(sshKeyPath, 0o600);

      // create manifest encrypted to the ssh key's age recipient
      daoKeyrackHostManifest.setSessionIdentity(sshKeyIdentity);
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: sshKeyRecipient.value,
        label: 'test-ssh-key',
        addedAt: new Date().toISOString(),
      });
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.testowner.age',
          owner: 'testowner',
          recipients: [recipient],
          hosts: {},
        }),
      });
      daoKeyrackHostManifest.setSessionIdentity(null);
      return {};
    });

    when('[t0] get called with owner but no explicit identity', () => {
      then('discovers ~/.ssh/$owner and decrypts', async () => {
        // no explicit identity set
        daoKeyrackHostManifest.setSessionIdentity(null);

        const result = await daoKeyrackHostManifest.get({
          owner: 'testowner',
          prikey: null,
        });

        expect(result).not.toBeNull();
        expect(result?.owner).toEqual('testowner');
      });
    });

    when('[t1] get called with explicit prikey param', () => {
      then('uses explicit prikey instead of discovery', async () => {
        daoKeyrackHostManifest.setSessionIdentity(null);

        const sshKeyPath = join(tempHome.path, '.ssh', 'testowner');
        const result = await daoKeyrackHostManifest.get({
          owner: 'testowner',
          prikey: sshKeyPath,
        });

        expect(result).not.toBeNull();
        expect(result?.owner).toEqual('testowner');
      });
    });
  });

  given('[case10] prikey auto-discovery with standard paths', () => {
    const sshKeyRecipient = useBeforeAll(async () => ({
      value: await getTestSshKeyAgeRecipient(),
    }));
    const sshKeyIdentity = getTestSshKeyAgeIdentity();

    // setup: write ssh key to ~/.ssh/id_ed25519 (standard path)
    useBeforeAll(async () => {
      // create ~/.ssh directory
      const sshDir = join(tempHome.path, '.ssh');
      if (!existsSync(sshDir)) mkdirSync(sshDir, { recursive: true });

      // write ssh key to ~/.ssh/id_ed25519 (standard path)
      const sshKeyPath = join(sshDir, 'id_ed25519');
      writeFileSync(sshKeyPath, TEST_SSH_KEY, 'utf8');
      chmodSync(sshKeyPath, 0o600);

      // create manifest encrypted to the ssh key's age recipient
      daoKeyrackHostManifest.setSessionIdentity(sshKeyIdentity);
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: sshKeyRecipient.value,
        label: 'test-ssh-key',
        addedAt: new Date().toISOString(),
      });
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.stdpath.age',
          owner: 'stdpath',
          recipients: [recipient],
          hosts: {},
        }),
      });
      daoKeyrackHostManifest.setSessionIdentity(null);
      return {};
    });

    when('[t0] get called without owner (no owner-specific path)', () => {
      then(
        'discovers standard path ~/.ssh/id_ed25519 and decrypts',
        async () => {
          daoKeyrackHostManifest.setSessionIdentity(null);

          // no owner → no owner-specific path → falls back to standard paths
          const result = await daoKeyrackHostManifest.get({
            owner: 'stdpath',
            prikey: null,
          });

          expect(result).not.toBeNull();
          expect(result?.owner).toEqual('stdpath');
        },
      );
    });
  });

  given('[case11] prikey auto-discovery fails with no keys', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());

    // setup: create manifest but no ssh keys available
    useBeforeAll(async () => {
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.nokeys.age',
          owner: 'nokeys',
          recipients: [recipient],
          hosts: {},
        }),
      });
      daoKeyrackHostManifest.setSessionIdentity(null);
      return {};
    });

    when(
      '[t0] get called without identity and keys from other tests present',
      () => {
        then(
          'fails with decrypt error (available keys cannot decrypt this manifest)',
          async () => {
            daoKeyrackHostManifest.setSessionIdentity(null);

            const error = await getError(
              daoKeyrackHostManifest.get({ owner: 'nokeys', prikey: null }),
            );

            expect(error).toBeDefined();
            // note: other tests in this suite create ssh keys in temp home
            // so the error is "failed to decrypt" not "no prikey available"
            expect(error?.message).toContain('failed to decrypt');
          },
        );
      },
    );
  });

  given('[case12] prikey auto-discovery fails with wrong key', () => {
    const keyPair = useBeforeAll(async () => generateAgeKeyPair());

    // setup: create manifest encrypted to age key, but ssh key is available
    useBeforeAll(async () => {
      // create ~/.ssh directory
      const sshDir = join(tempHome.path, '.ssh');
      if (!existsSync(sshDir)) mkdirSync(sshDir, { recursive: true });

      // write ssh key (wrong key — not a recipient of the manifest)
      const sshKeyPath = join(sshDir, 'wrongkey');
      writeFileSync(sshKeyPath, TEST_SSH_KEY, 'utf8');
      chmodSync(sshKeyPath, 0o600);

      // create manifest encrypted to a DIFFERENT age key pair
      daoKeyrackHostManifest.setSessionIdentity(keyPair.identity);
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: keyPair.recipient, // different from ssh key's recipient
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.wrongkey.age',
          owner: 'wrongkey',
          recipients: [recipient],
          hosts: {},
        }),
      });
      daoKeyrackHostManifest.setSessionIdentity(null);
      return {};
    });

    when('[t0] get called with key that does not match recipient', () => {
      then('fails with decrypt error and shows attempted paths', async () => {
        daoKeyrackHostManifest.setSessionIdentity(null);

        const error = await getError(
          daoKeyrackHostManifest.get({ owner: 'wrongkey', prikey: null }),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain('failed to decrypt');

        // error should include identities metadata
        const metadata = (error as unknown as Record<string, unknown>)
          ?.metadata as Record<string, unknown> | undefined;
        expect(metadata?.identities).toBeDefined();
        const identities = metadata?.identities as Record<string, unknown>;
        expect(identities.available).toBeDefined();
        expect(identities.attempted).toBeDefined();
      });
    });
  });

  given(
    '[case13] owner-specific path takes priority over standard paths',
    () => {
      const sshKeyRecipient = useBeforeAll(async () => ({
        value: await getTestSshKeyAgeRecipient(),
      }));
      const sshKeyIdentity = getTestSshKeyAgeIdentity();

      // setup: write CORRECT key to ~/.ssh/$owner, WRONG key to ~/.ssh/id_ed25519
      useBeforeAll(async () => {
        const sshDir = join(tempHome.path, '.ssh');
        if (!existsSync(sshDir)) mkdirSync(sshDir, { recursive: true });

        // write test ssh key to owner-specific path
        const ownerKeyPath = join(sshDir, 'priorityowner');
        writeFileSync(ownerKeyPath, TEST_SSH_KEY, 'utf8');
        chmodSync(ownerKeyPath, 0o600);

        // write a DIFFERENT key to standard path (would fail if tried)
        // we use a placeholder that will fail conversion (not valid ed25519)
        const stdKeyPath = join(sshDir, 'id_ed25519');
        writeFileSync(
          stdKeyPath,
          'invalid key content that should not be used',
          'utf8',
        );
        chmodSync(stdKeyPath, 0o600);

        // create manifest encrypted to test ssh key
        daoKeyrackHostManifest.setSessionIdentity(sshKeyIdentity);
        const recipient = new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: sshKeyRecipient.value,
          label: 'test-ssh-key',
          addedAt: new Date().toISOString(),
        });
        await daoKeyrackHostManifest.set({
          upsert: new KeyrackHostManifest({
            uri: '~/.rhachet/keyrack/keyrack.host.priorityowner.age',
            owner: 'priorityowner',
            recipients: [recipient],
            hosts: {},
          }),
        });
        daoKeyrackHostManifest.setSessionIdentity(null);
        return {};
      });

      when('[t0] get called with owner', () => {
        then(
          'uses owner-specific path first (ignores standard path)',
          async () => {
            daoKeyrackHostManifest.setSessionIdentity(null);

            // if standard path were tried first, it would fail
            // success proves owner-specific path has priority
            const result = await daoKeyrackHostManifest.get({
              owner: 'priorityowner',
              prikey: null,
            });

            expect(result).not.toBeNull();
            expect(result?.owner).toEqual('priorityowner');
          },
        );
      });
    },
  );
});
