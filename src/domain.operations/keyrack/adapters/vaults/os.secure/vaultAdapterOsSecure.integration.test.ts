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
        expect(result).toEqual('xai-test-key-123');
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
        expect(resultA).toEqual('value-a');

        const resultB = await vaultAdapterOsSecure.get({
          slug: 'KEY_B',
          identity: testIdentity,
        });
        expect(resultB).toEqual('value-b');
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
        expect(result).toEqual('new-value-a');
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
        expect(resultB).toEqual('value-b');
      });
    });

    when('[t2] del called for stored key', () => {
      then('removes encrypted file', async () => {
        await vaultAdapterOsSecure.del({ slug: 'KEY_A' });

        const result = await vaultAdapterOsSecure.get({
          slug: 'KEY_A',
          identity: testIdentity,
        });
        expect(result).toBeNull();
      });

      then('does not affect other keys', async () => {
        await vaultAdapterOsSecure.del({ slug: 'KEY_A' });

        const resultB = await vaultAdapterOsSecure.get({
          slug: 'KEY_B',
          identity: testIdentity,
        });
        expect(resultB).toEqual('value-b');
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
});
