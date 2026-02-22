import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { withTempHome } from '@src/.test/infra/withTempHome';
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
        const result = await daoKeyrackHostManifest.get({ owner: null });
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
          const result = await daoKeyrackHostManifest.get({ owner: null });

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
              daoKeyrackHostManifest.get({ owner: null }),
            );
            expect(error).toBeDefined();
            // per blueprint 6.4: discovery tries available keys; fails if none match
            // error is either "no identity available" (no keys found) or "failed to decrypt" (keys found but wrong)
            expect(
              error?.message.includes('no identity available') ||
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
            daoKeyrackHostManifest.get({ owner: null }),
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
        const result = await daoKeyrackHostManifest.get({ owner: null });

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
        const result = await daoKeyrackHostManifest.get({ owner: 'mechanic' });
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
        const result = await daoKeyrackHostManifest.get({ owner: 'multi' });
        expect(result?.owner).toEqual('multi');
      });

      then('second recipient can decrypt', async () => {
        daoKeyrackHostManifest.setSessionIdentity(keyPair2.identity);
        const result = await daoKeyrackHostManifest.get({ owner: 'multi' });
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
});
