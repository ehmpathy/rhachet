import { getError, given, then, when } from 'test-fns';

import {
  TEST_AGE_IDENTITY,
  TEST_AGE_RECIPIENT,
} from '@src/.test/assets/keyrack/age/testAgeKeys';
import {
  genMockPromptHiddenInput,
  setMockPromptValues,
} from '@src/.test/infra/mockPromptHiddenInput';
import { withTempHome } from '@src/.test/infra/withTempHome';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';

import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .note = mocks promptHiddenInput to simulate user secret input in tests
 * .why = integration tests need controlled input without real stdin
 * .note = no snapshot coverage because os.secure is internal vault adapter, not user-faced contract
 */
jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput());

import { vaultAdapterOsSecure } from './vaultAdapterOsSecure';

/**
 * .what = generates test context with identity and recipients
 * .why = vault set requires context for identity pool and recipients
 */
const genTestContext = (input: {
  identity: string;
  recipient: string;
}): ContextKeyrack =>
  ({
    owner: null,
    identity: {
      getAll: {
        prescribed: [],
        discovered: async () => [input.identity],
      },
    },
    hostManifest: new KeyrackHostManifest({
      uri: '~/.rhachet/keyrack/keyrack.host.age',
      owner: null,
      recipients: [
        new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: input.recipient,
          label: 'test-key',
          addedAt: new Date().toISOString(),
        }),
      ],
      hosts: {},
    }),
    vaultAdapters: {},
  }) as unknown as ContextKeyrack;

describe('vaultAdapterOsSecure', () => {
  const tempHome = withTempHome({ name: 'vaultAdapterOsSecure' });
  const testIdentity = TEST_AGE_IDENTITY;
  const testRecipient = TEST_AGE_RECIPIENT;

  beforeAll(() => tempHome.setup());
  afterAll(() => tempHome.teardown());

  beforeEach(async () => {
    // clean up vault directory before each test
    const vaultDir = join(
      tempHome.path,
      '.rhachet',
      'keyrack',
      'vault',
      'os.secure',
      'owner=default',
    );
    rmSync(vaultDir, { recursive: true, force: true });
  });

  given('[case1] vault without identity', () => {
    when('[t0] isUnlocked called without identity', () => {
      then('returns false', async () => {
        const result = await vaultAdapterOsSecure.isUnlocked({});
        expect(result).toBe(false);
      });
    });

    when('[t1] isUnlocked called with null identity', () => {
      then('returns false', async () => {
        const result = await vaultAdapterOsSecure.isUnlocked({
          identity: null,
        });
        expect(result).toBe(false);
      });
    });

    when('[t2] get called without identity', () => {
      then('throws error about vault locked', async () => {
        // first set a key so we can test get
        setMockPromptValues('test-value');
        await vaultAdapterOsSecure.set(
          { slug: 'TEST_KEY', mech: 'PERMANENT_VIA_REPLICA' },
          genTestContext({ identity: testIdentity, recipient: testRecipient }),
        );

        const error = await getError(
          vaultAdapterOsSecure.get({ slug: 'TEST_KEY' }),
        );
        expect(error.message).toContain('vault is locked');
      });
    });
  });

  given('[case2] vault with identity', () => {
    when('[t0] isUnlocked called with identity', () => {
      then('returns true', async () => {
        const result = await vaultAdapterOsSecure.isUnlocked({
          identity: testIdentity,
        });
        expect(result).toBe(true);
      });
    });

    when('[t1] get called for nonexistent key with identity', () => {
      then('returns null', async () => {
        const result = await vaultAdapterOsSecure.get({
          slug: 'NONEXISTENT',
          identity: testIdentity,
        });
        expect(result).toBeNull();
      });
    });

    when('[t2] set called with new key', () => {
      then('creates encrypted file', async () => {
        setMockPromptValues('xai-test-key-123');
        await vaultAdapterOsSecure.set(
          { slug: 'XAI_API_KEY', mech: 'PERMANENT_VIA_REPLICA' },
          genTestContext({ identity: testIdentity, recipient: testRecipient }),
        );

        const vaultDir = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.secure',
          'owner=default',
        );
        expect(existsSync(vaultDir)).toBe(true);

        const files = readdirSync(vaultDir);
        expect(files.length).toBe(1);
        expect(files[0]).toMatch(/\.age$/);
      });

      then('round-trips correctly', async () => {
        setMockPromptValues('xai-test-key-123');
        await vaultAdapterOsSecure.set(
          { slug: 'XAI_API_KEY', mech: 'PERMANENT_VIA_REPLICA' },
          genTestContext({ identity: testIdentity, recipient: testRecipient }),
        );

        const result = await vaultAdapterOsSecure.get({
          slug: 'XAI_API_KEY',
          identity: testIdentity,
        });
        expect(result?.key.secret).toEqual('xai-test-key-123');
      });
    });
  });

  given('[case3] vault has stored keys', () => {
    beforeEach(async () => {
      setMockPromptValues(['value-a', 'value-b']);
      const context = genTestContext({
        identity: testIdentity,
        recipient: testRecipient,
      });
      await vaultAdapterOsSecure.set(
        { slug: 'KEY_A', mech: 'PERMANENT_VIA_REPLICA' },
        context,
      );
      await vaultAdapterOsSecure.set(
        { slug: 'KEY_B', mech: 'PERMANENT_VIA_REPLICA' },
        context,
      );
    });

    when('[t0] get called for stored key', () => {
      then('returns decrypted value', async () => {
        const resultA = await vaultAdapterOsSecure.get({
          slug: 'KEY_A',
          identity: testIdentity,
        });
        expect(resultA?.key.secret).toEqual('value-a');

        const resultB = await vaultAdapterOsSecure.get({
          slug: 'KEY_B',
          identity: testIdentity,
        });
        expect(resultB?.key.secret).toEqual('value-b');
      });
    });

    when('[t1] set called to update key', () => {
      then('updates encrypted value', async () => {
        setMockPromptValues('new-value-a');
        await vaultAdapterOsSecure.set(
          { slug: 'KEY_A', mech: 'PERMANENT_VIA_REPLICA' },
          genTestContext({ identity: testIdentity, recipient: testRecipient }),
        );

        const result = await vaultAdapterOsSecure.get({
          slug: 'KEY_A',
          identity: testIdentity,
        });
        expect(result?.key.secret).toEqual('new-value-a');
      });

      then('does not affect other keys', async () => {
        setMockPromptValues('new-value-a');
        await vaultAdapterOsSecure.set(
          { slug: 'KEY_A', mech: 'PERMANENT_VIA_REPLICA' },
          genTestContext({ identity: testIdentity, recipient: testRecipient }),
        );

        const resultB = await vaultAdapterOsSecure.get({
          slug: 'KEY_B',
          identity: testIdentity,
        });
        expect(resultB?.key.secret).toEqual('value-b');
      });
    });

    when('[t2] del called for stored key', () => {
      then('removes encrypted file', async () => {
        await vaultAdapterOsSecure.del({
          slug: 'KEY_A',
          mech: null,
          meta: null,
        });

        const result = await vaultAdapterOsSecure.get({
          slug: 'KEY_A',
          identity: testIdentity,
        });
        expect(result).toBeNull();
      });

      then('does not affect other keys', async () => {
        await vaultAdapterOsSecure.del({
          slug: 'KEY_A',
          mech: null,
          meta: null,
        });

        const resultB = await vaultAdapterOsSecure.get({
          slug: 'KEY_B',
          identity: testIdentity,
        });
        expect(resultB?.key.secret).toEqual('value-b');
      });
    });
  });

  given('[case4] encryption security', () => {
    beforeEach(async () => {
      setMockPromptValues('super-secret-value');
      await vaultAdapterOsSecure.set(
        { slug: 'SECRET_KEY', mech: 'PERMANENT_VIA_REPLICA' },
        genTestContext({ identity: testIdentity, recipient: testRecipient }),
      );
    });

    when('[t0] encrypted file read directly', () => {
      then('does not contain plaintext value', async () => {
        const vaultDir = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.secure',
          'owner=default',
        );
        const files = readdirSync(vaultDir);
        expect(files.length).toBeGreaterThan(0);
        const { readFileSync } = await import('node:fs');
        const content = readFileSync(join(vaultDir, files[0]!), 'utf8');

        // encrypted content should not contain the plaintext value
        expect(content).not.toContain('super-secret-value');
      });

      then('contains age header', async () => {
        const vaultDir = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.secure',
          'owner=default',
        );
        const files = readdirSync(vaultDir);
        expect(files.length).toBeGreaterThan(0);
        const { readFileSync } = await import('node:fs');
        const content = readFileSync(join(vaultDir, files[0]!), 'utf8');

        // age-encrypted files in armored format start with "-----BEGIN AGE ENCRYPTED FILE-----"
        expect(content).toContain('-----BEGIN AGE ENCRYPTED FILE-----');
      });
    });
  });

  /**
   * .what = the claude-account juggle, through REAL age encryption on disk
   * .why = `getCredentialPath` hashes the key ADDRESS, never the bare slug — so a key cut
   *        for one reach lands in its own `.age` file rather than overwrite the key
   *        beside it. that is the storage-level twin of the daemon's `(slug, reach)`
   *        partition, and it is the ONE place a reach could be lost to disk
   *
   * .note = every other reach test in this repo proves a pure link (a parser, a store, a
   *         render). this one threads set → age encrypt → disk → age decrypt → get at a
   *         reach, so it is the first proof that reach survives real crypto round trip
   * .note = os.direct proves the same partition on a plaintext store. os.secure is the vault
   *         the vision's demo actually uses, and it is the only one whose path is DERIVED
   *         (a hash) rather than a literal key — so a hash over the wrong input is a defect
   *         no plaintext-store test could catch
   */
  given('[case5] one slug cut for two reaches', () => {
    const reachBeav = { exid: 'beav@ehmpathy.com' };
    const reachVlad = { exid: 'vlad@ehmpathy.com' };

    beforeEach(async () => {
      const context = genTestContext({
        identity: testIdentity,
        recipient: testRecipient,
      });

      // the reachless key, then two reaches of the SAME slug
      setMockPromptValues([
        'secret-reachless',
        'secret-for-beav',
        'secret-for-vlad',
      ]);
      await vaultAdapterOsSecure.set(
        { slug: 'ANTHROPIC_API_KEY', mech: 'PERMANENT_VIA_REPLICA' },
        context,
      );
      await vaultAdapterOsSecure.set(
        {
          slug: 'ANTHROPIC_API_KEY',
          mech: 'PERMANENT_VIA_REPLICA',
          reach: reachBeav,
        },
        context,
      );
      await vaultAdapterOsSecure.set(
        {
          slug: 'ANTHROPIC_API_KEY',
          mech: 'PERMANENT_VIA_REPLICA',
          reach: reachVlad,
        },
        context,
      );
    });

    when('[t0] the vault directory is read', () => {
      // .note = THREE files, not one. a hash over the bare slug would write all three to
      //         one path, so this count is what proves the address is the hash input
      then('each reach holds its own encrypted file', () => {
        const vaultDir = join(
          tempHome.path,
          '.rhachet',
          'keyrack',
          'vault',
          'os.secure',
          'owner=default',
        );
        expect(readdirSync(vaultDir)).toHaveLength(3);
      });
    });

    when('[t1] each reach is read back', () => {
      then('a reach-ask yields that reach’s own secret', async () => {
        const beav = await vaultAdapterOsSecure.get({
          slug: 'ANTHROPIC_API_KEY',
          identity: testIdentity,
          reach: reachBeav,
        });
        expect(beav?.key.secret).toEqual('secret-for-beav');

        const vlad = await vaultAdapterOsSecure.get({
          slug: 'ANTHROPIC_API_KEY',
          identity: testIdentity,
          reach: reachVlad,
        });
        expect(vlad?.key.secret).toEqual('secret-for-vlad');
      });

      // .note = e1 — a reachless address IS the bare slug, so the key written before any
      //         reach existed keeps its path and stays readable
      then('a reachless ask still yields the reachless secret', async () => {
        const found = await vaultAdapterOsSecure.get({
          slug: 'ANTHROPIC_API_KEY',
          identity: testIdentity,
        });
        expect(found?.key.secret).toEqual('secret-reachless');
      });

      then('the grant carries the reach it was asked for', async () => {
        const found = await vaultAdapterOsSecure.get({
          slug: 'ANTHROPIC_API_KEY',
          identity: testIdentity,
          reach: reachBeav,
        });
        expect(found?.reach).toEqual(reachBeav);
      });
    });

    when('[t2] a reach no key was cut for is asked for', () => {
      // .note = e6 — an absent reach-key is ABSENT, never a cue to hand back the reachless
      //         one. a fallback here would be the wrong-reach failure the whole design
      //         exists to forbid (e18)
      then('it yields null, never the reachless key beside it', async () => {
        const found = await vaultAdapterOsSecure.get({
          slug: 'ANTHROPIC_API_KEY',
          identity: testIdentity,
          reach: { exid: 'nobody@ehmpathy.com' },
        });
        expect(found).toBeNull();
      });
    });

    when('[t3] one reach is deleted', () => {
      then(
        'its peers survive — to cut one key is not to cut them all',
        async () => {
          // mech + meta are REQUIRED (null when unknown) so a forgotten value cannot hide behind
          // `undefined`. only aws.params reads them — os.secure ignores both
          await vaultAdapterOsSecure.del({
            slug: 'ANTHROPIC_API_KEY',
            reach: reachBeav,
            mech: null,
            meta: null,
          });

          const beav = await vaultAdapterOsSecure.get({
            slug: 'ANTHROPIC_API_KEY',
            identity: testIdentity,
            reach: reachBeav,
          });
          expect(beav).toBeNull();

          const vlad = await vaultAdapterOsSecure.get({
            slug: 'ANTHROPIC_API_KEY',
            identity: testIdentity,
            reach: reachVlad,
          });
          expect(vlad?.key.secret).toEqual('secret-for-vlad');

          const reachless = await vaultAdapterOsSecure.get({
            slug: 'ANTHROPIC_API_KEY',
            identity: testIdentity,
          });
          expect(reachless?.key.secret).toEqual('secret-reachless');
        },
      );
    });
  });
});
