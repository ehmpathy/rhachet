import { BadRequestError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';
import {
  createTestHomeWithSshKey,
  TEST_SSH_AGE_RECIPIENT,
} from '@src/.test/infra';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyHost,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { genContextKeyrackGrantUnlock } from './genContextKeyrackGrantUnlock';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';
import { unlockKeyrackKeys } from './session/unlockKeyrackKeys';

/**
 * .what = acceptance tests for env=all hosting strategies
 * .why = prove that both universal and per-env hosting satisfy repo manifest env.all requirements
 *
 * .note = these tests verify the spec in spec.env-all-roundtrip-behavior.md
 */
describe('envAllHostingStrategies.integration', () => {
  // use test home with SSH key in ~/.ssh/id_ed25519
  // dao will discover this key naturally via default discovery
  const testHome = createTestHomeWithSshKey({
    name: 'envAllHostingStrategies',
  });

  beforeAll(() => testHome.setup());
  afterAll(() => testHome.teardown());

  given(
    '[case1] repo manifest env.all + host manifest universal hosting',
    () => {
      /**
       * scenario: key is REQUIRED in env.all, HOSTED under org.all.KEY
       * expected: key is accessible for any env via fallback
       */
      const secretValue = 'universal-api-key-value';

      const repo = useBeforeAll(async () => {
        const root = join(testHome.path, 'repo-case1');
        mkdirSync(join(root, '.agent'), { recursive: true });

        // repo manifest declares key in env.all (REQUIRED for all envs)
        writeFileSync(
          join(root, '.agent', 'keyrack.yml'),
          `org: testorg
env.all:
  - API_KEY
env.test: []
env.prod: []
`,
          'utf8',
        );
        return { path: root };
      });

      const manifest = useBeforeAll(async () => {
        const recipient = new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: TEST_SSH_AGE_RECIPIENT,
          label: 'test-key',
          addedAt: new Date().toISOString(),
        });

        const now = new Date().toISOString();

        // host manifest stores key under org.all (UNIVERSAL hosting)
        return daoKeyrackHostManifest.set({
          findsert: new KeyrackHostManifest({
            uri: '~/.rhachet/keyrack/keyrack.host.case1.age',
            owner: 'case1',
            recipients: [recipient],
            hosts: {
              'testorg.all.API_KEY': new KeyrackKeyHost({
                slug: 'testorg.all.API_KEY',
                env: 'all',
                org: 'testorg',
                vault: 'os.direct',
                mech: 'PERMANENT_VIA_REPLICA',
                exid: null,
                vaultRecipient: null,
                maxDuration: null,
                createdAt: now,
                updatedAt: now,
              }),
            },
          }),
        });
      });

      when('[t0] unlock called with --env test', () => {
        then('finds universal key via fallback', async () => {
          const vaultAdapter = genMockVaultAdapter({
            storage: { 'testorg.all.API_KEY': secretValue },
          });

          const context = await genContextKeyrackGrantUnlock({
            owner: 'case1',
            gitroot: repo.path,
          });
          context.vaultAdapters['os.direct'] = vaultAdapter;

          const result = await unlockKeyrackKeys(
            { owner: 'case1', env: 'test', key: 'API_KEY' },
            context,
          );

          expect(result.unlocked.length).toBe(1);
          // slug shows .all. — fallback found universal hosting
          expect(result.unlocked[0]?.slug).toEqual('testorg.all.API_KEY');
          expect(result.unlocked[0]?.env).toEqual('all');
        });
      });

      when('[t1] unlock called with --env prod', () => {
        then('same universal key satisfies prod as well', async () => {
          const vaultAdapter = genMockVaultAdapter({
            storage: { 'testorg.all.API_KEY': secretValue },
          });

          const context = await genContextKeyrackGrantUnlock({
            owner: 'case1',
            gitroot: repo.path,
          });
          context.vaultAdapters['os.direct'] = vaultAdapter;

          const result = await unlockKeyrackKeys(
            { owner: 'case1', env: 'prod', key: 'API_KEY' },
            context,
          );

          expect(result.unlocked.length).toBe(1);
          // same universal key satisfies prod
          expect(result.unlocked[0]?.slug).toEqual('testorg.all.API_KEY');
        });
      });

      when('[t2] unlock called with --env all', () => {
        then(
          'unlocks universal key and any env-specific expansions',
          async () => {
            // env=all unlocks all keys in manifest — universal key satisfies all requests
            const vaultAdapter = genMockVaultAdapter({
              storage: { 'testorg.all.API_KEY': secretValue },
            });

            const context = await genContextKeyrackGrantUnlock({
              owner: 'case1',
              gitroot: repo.path,
            });
            context.vaultAdapters['os.direct'] = vaultAdapter;

            const result = await unlockKeyrackKeys(
              { owner: 'case1', env: 'all', key: 'API_KEY' },
              context,
            );

            // env=all expands to all envs; universal hosting satisfies all via fallback
            expect(result.unlocked.length).toBeGreaterThanOrEqual(1);
            // at minimum, the universal key is included
            const universalKey = result.unlocked.find(
              (k) => k.slug === 'testorg.all.API_KEY',
            );
            expect(universalKey).toBeDefined();
          },
        );
      });
    },
  );

  given('[case2] repo manifest env.all + host manifest per-env hosting', () => {
    /**
     * scenario: key is REQUIRED in env.all, HOSTED under org.test.KEY
     * expected: key is accessible ONLY for env=test, NOT for env=prod
     */
    const secretValue = 'per-env-api-key-value';

    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case2');
      mkdirSync(join(root, '.agent'), { recursive: true });

      // repo manifest declares key in env.all (REQUIRED for all envs)
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.all:
  - API_KEY
env.test: []
env.prod: []
`,
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: TEST_SSH_AGE_RECIPIENT,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      const now = new Date().toISOString();

      // host manifest stores key under org.test (PER-ENV hosting)
      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case2.age',
          owner: 'case2',
          recipients: [recipient],
          hosts: {
            'testorg.test.API_KEY': new KeyrackKeyHost({
              slug: 'testorg.test.API_KEY',
              env: 'test',
              org: 'testorg',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              exid: null,
              vaultRecipient: null,
              maxDuration: null,
              createdAt: now,
              updatedAt: now,
            }),
          },
        }),
      });
    });

    when('[t0] unlock called with --env test', () => {
      then('finds per-env key (exact match)', async () => {
        const vaultAdapter = genMockVaultAdapter({
          storage: { 'testorg.test.API_KEY': secretValue },
        });

        const context = await genContextKeyrackGrantUnlock({
          owner: 'case2',
          gitroot: repo.path,
        });
        context.vaultAdapters['os.direct'] = vaultAdapter;

        const result = await unlockKeyrackKeys(
          { owner: 'case2', env: 'test', key: 'API_KEY' },
          context,
        );

        expect(result.unlocked.length).toBe(1);
        // slug shows .test. — exact match, not fallback
        expect(result.unlocked[0]?.slug).toEqual('testorg.test.API_KEY');
        expect(result.unlocked[0]?.env).toEqual('test');
      });
    });

    when('[t1] unlock called with --env prod', () => {
      then('key is omitted (no universal fallback)', async () => {
        const vaultAdapter = genMockVaultAdapter({
          storage: { 'testorg.test.API_KEY': secretValue },
        });

        const context = await genContextKeyrackGrantUnlock({
          owner: 'case2',
          gitroot: repo.path,
        });
        context.vaultAdapters['os.direct'] = vaultAdapter;

        const result = await unlockKeyrackKeys(
          { owner: 'case2', env: 'prod', key: 'API_KEY' },
          context,
        );

        // per-env hosting does NOT satisfy other envs — key is omitted
        expect(result.unlocked.length).toBe(0);
        expect(result.omitted.length).toBe(1);
        expect(result.omitted[0]).toEqual({
          slug: 'testorg.prod.API_KEY',
          reason: 'absent',
        });
      });
    });
  });

  given(
    '[case3] both universal and per-env exist — per-env takes precedence',
    () => {
      /**
       * scenario: key hosted BOTH under org.all.KEY AND org.test.KEY
       * expected: per-env (exact match) takes precedence over universal
       */
      const universalValue = 'universal-fallback-value';
      const perEnvValue = 'per-env-override-value';

      const repo = useBeforeAll(async () => {
        const root = join(testHome.path, 'repo-case3');
        mkdirSync(join(root, '.agent'), { recursive: true });

        writeFileSync(
          join(root, '.agent', 'keyrack.yml'),
          `org: testorg
env.all:
  - API_KEY
env.test: []
env.prod: []
`,
          'utf8',
        );
        return { path: root };
      });

      const manifest = useBeforeAll(async () => {
        const recipient = new KeyrackKeyRecipient({
          mech: 'age',
          pubkey: TEST_SSH_AGE_RECIPIENT,
          label: 'test-key',
          addedAt: new Date().toISOString(),
        });

        const now = new Date().toISOString();

        // host manifest has BOTH universal and per-env
        return daoKeyrackHostManifest.set({
          findsert: new KeyrackHostManifest({
            uri: '~/.rhachet/keyrack/keyrack.host.case3.age',
            owner: 'case3',
            recipients: [recipient],
            hosts: {
              'testorg.all.API_KEY': new KeyrackKeyHost({
                slug: 'testorg.all.API_KEY',
                env: 'all',
                org: 'testorg',
                vault: 'os.direct',
                mech: 'PERMANENT_VIA_REPLICA',
                exid: null,
                vaultRecipient: null,
                maxDuration: null,
                createdAt: now,
                updatedAt: now,
              }),
              'testorg.test.API_KEY': new KeyrackKeyHost({
                slug: 'testorg.test.API_KEY',
                env: 'test',
                org: 'testorg',
                vault: 'os.direct',
                mech: 'PERMANENT_VIA_REPLICA',
                exid: null,
                vaultRecipient: null,
                maxDuration: null,
                createdAt: now,
                updatedAt: now,
              }),
            },
          }),
        });
      });

      when('[t0] unlock called with --env test', () => {
        then('per-env takes precedence over universal', async () => {
          const vaultAdapter = genMockVaultAdapter({
            storage: {
              'testorg.all.API_KEY': universalValue,
              'testorg.test.API_KEY': perEnvValue,
            },
          });

          const context = await genContextKeyrackGrantUnlock({
            owner: 'case3',
            gitroot: repo.path,
          });
          context.vaultAdapters['os.direct'] = vaultAdapter;

          const result = await unlockKeyrackKeys(
            { owner: 'case3', env: 'test', key: 'API_KEY' },
            context,
          );

          expect(result.unlocked.length).toBe(1);
          // exact match takes precedence
          expect(result.unlocked[0]?.slug).toEqual('testorg.test.API_KEY');
          expect(result.unlocked[0]?.env).toEqual('test');
        });
      });

      when('[t1] unlock called with --env prod', () => {
        then('falls back to universal (no per-env for prod)', async () => {
          const vaultAdapter = genMockVaultAdapter({
            storage: {
              'testorg.all.API_KEY': universalValue,
              'testorg.test.API_KEY': perEnvValue,
            },
          });

          const context = await genContextKeyrackGrantUnlock({
            owner: 'case3',
            gitroot: repo.path,
          });
          context.vaultAdapters['os.direct'] = vaultAdapter;

          const result = await unlockKeyrackKeys(
            { owner: 'case3', env: 'prod', key: 'API_KEY' },
            context,
          );

          expect(result.unlocked.length).toBe(1);
          // falls back to universal
          expect(result.unlocked[0]?.slug).toEqual('testorg.all.API_KEY');
        });
      });
    },
  );

  given('[case4] repo manifest env.test only — no fallback', () => {
    /**
     * scenario: key is REQUIRED only in env.test, no universal hosting
     * expected: key is NOT accessible for env=prod (no fallback)
     */
    const secretValue = 'test-only-value';

    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case4');
      mkdirSync(join(root, '.agent'), { recursive: true });

      // repo manifest declares key ONLY in env.test
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.test:
  - API_KEY
`,
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: TEST_SSH_AGE_RECIPIENT,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      const now = new Date().toISOString();

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case4.age',
          owner: 'case4',
          recipients: [recipient],
          hosts: {
            'testorg.test.API_KEY': new KeyrackKeyHost({
              slug: 'testorg.test.API_KEY',
              env: 'test',
              org: 'testorg',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              exid: null,
              vaultRecipient: null,
              maxDuration: null,
              createdAt: now,
              updatedAt: now,
            }),
          },
        }),
      });
    });

    when('[t0] unlock called with --env test', () => {
      then('exact match succeeds', async () => {
        const vaultAdapter = genMockVaultAdapter({
          storage: { 'testorg.test.API_KEY': secretValue },
        });

        const context = await genContextKeyrackGrantUnlock({
          owner: 'case4',
          gitroot: repo.path,
        });
        context.vaultAdapters['os.direct'] = vaultAdapter;

        const result = await unlockKeyrackKeys(
          { owner: 'case4', env: 'test', key: 'API_KEY' },
          context,
        );

        expect(result.unlocked.length).toBe(1);
        expect(result.unlocked[0]?.slug).toEqual('testorg.test.API_KEY');
      });
    });

    when('[t1] unlock called with --env prod', () => {
      then('throws BadRequestError (key not declared for prod)', async () => {
        const vaultAdapter = genMockVaultAdapter({
          storage: { 'testorg.test.API_KEY': secretValue },
        });

        const context = await genContextKeyrackGrantUnlock({
          owner: 'case4',
          gitroot: repo.path,
        });
        context.vaultAdapters['os.direct'] = vaultAdapter;

        // key not in manifest for prod → BadRequestError
        const error = await getError(
          unlockKeyrackKeys(
            { owner: 'case4', env: 'prod', key: 'API_KEY' },
            context,
          ),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('key not found in manifest');
      });
    });
  });

  given('[case5] get after unlock reflects actual hosted slug', () => {
    /**
     * scenario: unlock finds universal key via fallback for env=test request
     * expected: subsequent get shows the actual slug that was unlocked
     */
    const secretValue = 'get-shows-actual-slug';

    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case5');
      mkdirSync(join(root, '.agent'), { recursive: true });

      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        `org: testorg
env.all:
  - API_KEY
env.test: []
env.prod: []
`,
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: TEST_SSH_AGE_RECIPIENT,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      const now = new Date().toISOString();

      // stored under universal hosting
      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case5.age',
          owner: 'case5',
          recipients: [recipient],
          hosts: {
            'testorg.all.API_KEY': new KeyrackKeyHost({
              slug: 'testorg.all.API_KEY',
              env: 'all',
              org: 'testorg',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              exid: null,
              vaultRecipient: null,
              maxDuration: null,
              createdAt: now,
              updatedAt: now,
            }),
          },
        }),
      });
    });

    when('[t0] unlock with --env test, then get with --env test', () => {
      then(
        'get returns the actual slug that was unlocked (.all.)',
        async () => {
          const vaultAdapter = genMockVaultAdapter({
            storage: { 'testorg.all.API_KEY': secretValue },
          });

          // unlock with env=test (will find universal via fallback)
          const unlockContext = await genContextKeyrackGrantUnlock({
            owner: 'case5',
            gitroot: repo.path,
          });
          unlockContext.vaultAdapters['os.direct'] = vaultAdapter;

          await unlockKeyrackKeys(
            { owner: 'case5', env: 'test', key: 'API_KEY' },
            unlockContext,
          );

          // get with env=test should show the actual unlocked slug
          const getContext = await genContextKeyrackGrantGet({
            owner: 'case5',
            gitroot: repo.path,
          });

          const result = await getKeyrackKeyGrant(
            { for: { key: 'testorg.test.API_KEY' } },
            getContext,
          );

          // get returns what was actually unlocked
          expect(result.status).toEqual('granted');
          if (result.status === 'granted') {
            // the slug shows .all. because that's what was actually unlocked
            expect(result.grant.slug).toEqual('testorg.all.API_KEY');
          }
        },
      );
    });
  });
});
