import { given, then, useBeforeAll, when } from 'test-fns';
import { parse as parseYaml } from 'yaml';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';
import {
  createTestHomeWithSshKey,
  TEST_SSH_AGE_IDENTITY,
  TEST_SSH_AGE_RECIPIENT,
} from '@src/.test/infra';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateAgeKeyPair } from './adapters/ageRecipientCrypto';
import { type ContextKeyrack, genContextKeyrack } from './genContextKeyrack';
import { setKeyrackKeyHost } from './setKeyrackKeyHost';

describe('setKeyrackKeyHost.integration', () => {
  // use test home with SSH key in ~/.ssh/id_ed25519
  // dao will discover this key naturally via default discovery
  const testHome = createTestHomeWithSshKey({
    name: 'setKeyrackKeyHost-integration',
  });

  beforeAll(() => testHome.setup());
  afterAll(() => testHome.teardown());

  given('[case1] set --env sudo', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case1');
      mkdirSync(join(root, '.agent'), { recursive: true });

      // create keyrack.yml with org
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        'org: ehmpathy\n',
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.age',
          owner: null,
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] set called with env=sudo', () => {
      then('stores in encrypted host manifest', async () => {
        const context: ContextKeyrack = {
          owner: null,
          identity: {
            getOne: async () => TEST_SSH_AGE_IDENTITY,
            getAll: {
              discovered: async () => [TEST_SSH_AGE_IDENTITY],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          gitroot: repo.path,
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
          },
        };

        const result = await setKeyrackKeyHost(
          {
            slug: 'ehmpathy.sudo.SECRET_TOKEN',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: '@this',
          },
          context,
        );

        expect(result.slug).toEqual('ehmpathy.sudo.SECRET_TOKEN');
        expect(result.env).toEqual('sudo');
        expect(result.org).toEqual('ehmpathy');

        // verify stored in host manifest - dao discovers key naturally
        const contextForGet = genContextKeyrack({ owner: null });
        const manifestAfter = await daoKeyrackHostManifest.get(
          {
            owner: null,
          },
          contextForGet,
        );
        expect(
          manifestAfter?.manifest.hosts['ehmpathy.sudo.SECRET_TOKEN'],
        ).toBeDefined();
        expect(
          manifestAfter?.manifest.hosts['ehmpathy.sudo.SECRET_TOKEN']?.env,
        ).toEqual('sudo');
      });

      then('does NOT appear in keyrack.yml', async () => {
        // read keyrack.yml and verify sudo key is not present
        const keyrackYmlPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(keyrackYmlPath, 'utf8');
        const parsed = parseYaml(content) as Record<string, unknown>;

        // check no env.sudo section was created
        expect(parsed['env.sudo']).toBeUndefined();

        // check key is not in any env section
        const allKeys: string[] = [];
        for (const [key, value] of Object.entries(parsed)) {
          if (key.startsWith('env.') && Array.isArray(value)) {
            allKeys.push(...value.map(String));
          }
        }
        expect(allKeys).not.toContain('SECRET_TOKEN');
      });
    });
  });

  given('[case2] set --env all', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case2');
      mkdirSync(join(root, '.agent'), { recursive: true });

      // create keyrack.yml with org and env.all section
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        'org: ehmpathy\nenv.all: []\n',
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case2.age',
          owner: 'case2',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] set called with env=all', () => {
      then('stores in encrypted host manifest', async () => {
        const context: ContextKeyrack = {
          owner: 'case2',
          identity: {
            getOne: async () => TEST_SSH_AGE_IDENTITY,
            getAll: {
              discovered: async () => [TEST_SSH_AGE_IDENTITY],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          gitroot: repo.path,
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
          },
        };

        const result = await setKeyrackKeyHost(
          {
            slug: 'ehmpathy.all.API_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'all',
            org: '@this',
          },
          context,
        );

        expect(result.slug).toEqual('ehmpathy.all.API_KEY');
        expect(result.env).toEqual('all');
        expect(result.org).toEqual('ehmpathy');

        // verify stored in host manifest - dao discovers key naturally
        const contextForGet = genContextKeyrack({ owner: 'case2' });
        const manifestAfter = await daoKeyrackHostManifest.get(
          {
            owner: 'case2',
          },
          contextForGet,
        );
        expect(
          manifestAfter?.manifest.hosts['ehmpathy.all.API_KEY'],
        ).toBeDefined();
      });

      then('ALSO appears in keyrack.yml', async () => {
        // read keyrack.yml and verify the key was added to env.all
        const keyrackYmlPath = join(repo.path, '.agent', 'keyrack.yml');
        const content = readFileSync(keyrackYmlPath, 'utf8');
        const parsed = parseYaml(content) as Record<string, unknown>;

        // check env.all section contains the key
        const envAll = parsed['env.all'];
        expect(Array.isArray(envAll)).toBe(true);
        expect(envAll).toContain('API_KEY');
      });
    });
  });

  given('[case3] set --org @all', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case3.age',
          owner: 'case3',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] set called with org=@all', () => {
      then('stores with org: @all (not resolved)', async () => {
        const context: ContextKeyrack = {
          owner: 'case3',
          identity: {
            getOne: async () => TEST_SSH_AGE_IDENTITY,
            getAll: {
              discovered: async () => [TEST_SSH_AGE_IDENTITY],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
          },
        };

        const result = await setKeyrackKeyHost(
          {
            slug: 'global.sudo.CROSS_ORG_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: '1password',
            env: 'sudo',
            org: '@all',
          },
          context,
        );

        expect(result.slug).toEqual('global.sudo.CROSS_ORG_KEY');
        expect(result.org).toEqual('@all');

        // verify stored in host manifest with @all org - dao discovers key naturally
        const contextForGet = genContextKeyrack({ owner: 'case3' });
        const manifestAfter = await daoKeyrackHostManifest.get(
          {
            owner: 'case3',
          },
          contextForGet,
        );
        const host = manifestAfter?.manifest.hosts['global.sudo.CROSS_ORG_KEY'];
        expect(host).toBeDefined();
        expect(host?.org).toEqual('@all');
      });
    });
  });

  given('[case4] set with vaultRecipient for os.secure', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;
    // separate keypair for vault recipient (different from manifest recipient)
    const vaultKeyPair = useBeforeAll(async () => generateAgeKeyPair());

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case4.age',
          owner: 'case4',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] set called with vaultRecipient', () => {
      then('stores vaultRecipient in KeyrackKeyHost', async () => {
        const context: ContextKeyrack = {
          owner: 'case4',
          identity: {
            getOne: async () => TEST_SSH_AGE_IDENTITY,
            getAll: {
              discovered: async () => [TEST_SSH_AGE_IDENTITY],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
          },
        };

        const result = await setKeyrackKeyHost(
          {
            slug: 'ehmpathy.sudo.SECURE_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.secure',
            env: 'sudo',
            org: '@this',
            vaultRecipient: vaultKeyPair.recipient,
          },
          context,
        );

        expect(result.vaultRecipient).toEqual(vaultKeyPair.recipient);

        // verify stored in host manifest - dao discovers key naturally
        const contextForGet = genContextKeyrack({ owner: 'case4' });
        const manifestAfter = await daoKeyrackHostManifest.get(
          {
            owner: 'case4',
          },
          contextForGet,
        );
        const host = manifestAfter?.manifest.hosts['ehmpathy.sudo.SECURE_KEY'];
        expect(host?.vaultRecipient).toEqual(vaultKeyPair.recipient);
      });
    });
  });

  given('[case5] set with maxDuration', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case5.age',
          owner: 'case5',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] set called with maxDuration', () => {
      then('stores maxDuration in KeyrackKeyHost', async () => {
        const context: ContextKeyrack = {
          owner: 'case5',
          identity: {
            getOne: async () => TEST_SSH_AGE_IDENTITY,
            getAll: {
              discovered: async () => [TEST_SSH_AGE_IDENTITY],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'ehmpathy' }),
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
          },
        };

        const result = await setKeyrackKeyHost(
          {
            slug: 'ehmpathy.sudo.SENSITIVE_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: '@this',
            maxDuration: '5m',
          },
          context,
        );

        expect(result.maxDuration).toEqual('5m');

        // verify stored in host manifest - dao discovers key naturally
        const contextForGet = genContextKeyrack({ owner: 'case5' });
        const manifestAfter = await daoKeyrackHostManifest.get(
          {
            owner: 'case5',
          },
          contextForGet,
        );
        const host =
          manifestAfter?.manifest.hosts['ehmpathy.sudo.SENSITIVE_KEY'];
        expect(host?.maxDuration).toEqual('5m');
      });
    });
  });

  given('[case6] set --at custom keyrack path', () => {
    const testRecipient = TEST_SSH_AGE_RECIPIENT;
    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case6');
      mkdirSync(join(root, '.agent'), { recursive: true });
      mkdirSync(join(root, 'custom', 'role'), { recursive: true });

      // create default keyrack.yml (should NOT be modified)
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        'org: defaultorg\n',
        'utf8',
      );

      // create custom keyrack at specified path
      writeFileSync(
        join(root, 'custom', 'role', 'keyrack.yml'),
        'org: customorg\nenv.prod: []\n',
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: testRecipient,
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case6.age',
          owner: 'case6',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] set called with --at custom path', () => {
      then('writes key to custom keyrack at specified path', async () => {
        const context: ContextKeyrack = {
          owner: 'case6',
          identity: {
            getOne: async () => TEST_SSH_AGE_IDENTITY,
            getAll: {
              discovered: async () => [TEST_SSH_AGE_IDENTITY],
              prescribed: [],
            },
          },
          hostManifest: manifest,
          repoManifest: genMockKeyrackRepoManifest({ org: 'customorg' }),
          gitroot: repo.path,
          vaultAdapters: {
            'os.envvar': genMockVaultAdapter(),
            'os.direct': genMockVaultAdapter(),
            'os.secure': genMockVaultAdapter(),
            'os.daemon': genMockVaultAdapter(),
            '1password': genMockVaultAdapter(),
            'aws.config': genMockVaultAdapter(),
          },
        };

        const result = await setKeyrackKeyHost(
          {
            slug: 'customorg.prod.CUSTOM_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'prod',
            org: 'customorg',
            at: 'custom/role/keyrack.yml',
          },
          context,
        );

        expect(result.slug).toEqual('customorg.prod.CUSTOM_KEY');
        expect(result.env).toEqual('prod');
        expect(result.org).toEqual('customorg');

        // verify key was written to custom keyrack
        const customKeyrackPath = join(
          repo.path,
          'custom',
          'role',
          'keyrack.yml',
        );
        const customContent = readFileSync(customKeyrackPath, 'utf8');
        const customParsed = parseYaml(customContent) as Record<
          string,
          unknown
        >;
        const envProd = customParsed['env.prod'];
        expect(Array.isArray(envProd)).toBe(true);
        expect(envProd).toContain('CUSTOM_KEY');
      });

      then('does NOT modify default keyrack.yml', async () => {
        // verify default keyrack was not modified
        const defaultKeyrackPath = join(repo.path, '.agent', 'keyrack.yml');
        const defaultContent = readFileSync(defaultKeyrackPath, 'utf8');
        const defaultParsed = parseYaml(defaultContent) as Record<
          string,
          unknown
        >;

        // should still only have org, no env sections
        expect(defaultParsed.org).toEqual('defaultorg');
        expect(defaultParsed['env.prod']).toBeUndefined();
      });
    });
  });
});
