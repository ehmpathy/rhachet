import { getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  createTestHomeWithSshKey,
  TEST_SSH_AGE_RECIPIENT,
} from '@src/.test/infra';
import {
  KeyrackHostManifest,
  KeyrackKeyHost,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import { generateAgeKeyPair } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { daoKeyrackHostManifest } from './index';

describe('daoKeyrackHostManifest', () => {
  // use test home with SSH key in ~/.ssh/id_ed25519
  // dao will discover this key naturally via default discovery
  const testHome = createTestHomeWithSshKey({
    name: 'daoKeyrackHostManifest',
  });

  beforeAll(() => testHome.setup());
  afterAll(() => testHome.teardown());

  given('[case1] no manifest exists (default owner)', () => {
    when('[t0] get called', () => {
      then('returns null', async () => {
        const result = await daoKeyrackHostManifest.get({
          owner: null,
        });
        expect(result).toBeNull();
      });
    });
  });

  given(
    '[case2] manifest lifecycle with age encryption (default owner)',
    () => {
      // use the shared test key - dao will discover it naturally
      const testRecipient = TEST_SSH_AGE_RECIPIENT;

      when('[t0] set.findsert called with new manifest', () => {
        then('creates encrypted manifest file', async () => {
          const recipient = new KeyrackKeyRecipient({
            mech: 'age',
            pubkey: testRecipient,
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
            testHome.path,
            '.rhachet',
            'keyrack',
            'keyrack.host.age',
          );
          expect(existsSync(path)).toBe(true);
        });

        then('file is encrypted (armored age format)', async () => {
          const path = join(
            testHome.path,
            '.rhachet',
            'keyrack',
            'keyrack.host.age',
          );
          const content = readFileSync(path, 'utf8');
          expect(content).toMatch(/^-----BEGIN AGE ENCRYPTED FILE-----/);
        });

        then('file permissions are 0600', async () => {
          const path = join(
            testHome.path,
            '.rhachet',
            'keyrack',
            'keyrack.host.age',
          );
          const stats = statSync(path);
          const mode = stats.mode & 0o777;
          expect(mode).toBe(0o600);
        });
      });

      when('[t1] get with discovered identity', () => {
        then('decrypts and returns manifest via discovery', async () => {
          // no prikeys needed - dao discovers SSH key from ~/.ssh/id_ed25519
          const result = await daoKeyrackHostManifest.get({
            owner: null,
          });

          expect(result).not.toBeNull();
          expect(result?.manifest.owner).toBeNull();
          expect(result?.manifest.recipients).toHaveLength(1);
          expect(result?.manifest.recipients[0]?.pubkey).toEqual(testRecipient);
        });
      });

      when('[t2] get with wrong identity (different manifest)', () => {
        then('throws error when no discovered key can decrypt', async () => {
          // create a manifest encrypted to a different key
          const wrongKeyPair = await generateAgeKeyPair();
          const wrongRecipient = new KeyrackKeyRecipient({
            mech: 'age',
            pubkey: wrongKeyPair.recipient,
            label: 'wrong-key',
            addedAt: new Date().toISOString(),
          });

          await daoKeyrackHostManifest.set({
            upsert: new KeyrackHostManifest({
              uri: '~/.rhachet/keyrack/keyrack.host.wrong-key-test.age',
              owner: 'wrong-key-test',
              recipients: [wrongRecipient],
              hosts: {},
            }),
          });

          // try to get it - discovery will find our SSH key but it won't decrypt
          const error = await getError(
            daoKeyrackHostManifest.get({
              owner: 'wrong-key-test',
            }),
          );
          expect(error).toBeDefined();
          expect(error?.message).toContain('failed to decrypt host manifest');
        });
      });
    },
  );

  given('[case3] manifest with hosts (default owner)', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      const host = new KeyrackKeyHost({
        slug: 'ehmpathy.sudo.GITHUB_TOKEN',
        exid: null,
        vault: 'os.direct',
        mech: 'PERMANENT_VIA_REPLICA',
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
        const result = await daoKeyrackHostManifest.get({
          owner: null,
        });

        expect(
          result?.manifest.hosts['ehmpathy.sudo.GITHUB_TOKEN'],
        ).toBeDefined();
        const host = result?.manifest.hosts['ehmpathy.sudo.GITHUB_TOKEN'];
        expect(host?.env).toEqual('sudo');
        expect(host?.org).toEqual('ehmpathy');
        expect(host?.vault).toEqual('os.direct');
        expect(host?.mech).toEqual('PERMANENT_VIA_REPLICA');
      });
    });
  });

  given('[case4] per-owner manifest (mechanic)', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
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
          testHome.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.mechanic.age',
        );
        expect(existsSync(path)).toBe(true);
      });

      then('owner is stored in manifest', async () => {
        const result = await daoKeyrackHostManifest.get({
          owner: 'mechanic',
        });
        expect(result?.manifest.owner).toEqual('mechanic');
      });
    });
  });

  given('[case5] findsert semantics', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;

    const firstManifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
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
        const recipient = new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: testRecipient,
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
        const recipient = new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: testRecipient,
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
          daoKeyrackHostManifest.set({
            findsert: newManifest,
          }),
        );

        expect(error).toBeDefined();
        expect(error?.message).toContain('different uri');
      });
    });
  });

  given('[case6] multi-recipient encryption', () => {
    // test with the shared test key + a second key
    const testRecipient = TEST_SSH_AGE_RECIPIENT;
    const keyPair2 = useBeforeAll(async () => generateAgeKeyPair());

    const manifest = useBeforeAll(async () => {
      const recipients = [
        new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: testRecipient,
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

    when('[t0] first recipient can decrypt via discovery', () => {
      then('decrypts successfully', async () => {
        // dao discovers SSH key which corresponds to testRecipient
        const result = await daoKeyrackHostManifest.get({
          owner: 'multi',
        });
        expect(result?.manifest.owner).toEqual('multi');
      });
    });
  });

  given('[case7] upsert overwrites manifest', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;

    const firstManifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      const oldHost = new KeyrackKeyHost({
        slug: 'OLD_KEY',
        mech: 'PERMANENT_VIA_REPLICA',
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
        const recipient = new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: testRecipient,
          label: 'test-key',
          addedAt: new Date().toISOString(),
        });

        const newHost = new KeyrackKeyHost({
          slug: 'NEW_KEY',
          mech: 'EPHEMERAL_VIA_GITHUB_APP',
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
          testHome.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.upsert-test.age',
        );
        const content = readFileSync(path, 'utf8');
        expect(content).toMatch(/^-----BEGIN AGE ENCRYPTED FILE-----/);
      });
    });
  });
});
