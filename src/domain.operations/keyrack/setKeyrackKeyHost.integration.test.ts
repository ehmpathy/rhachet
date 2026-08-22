import { given, then, useBeforeAll, when } from 'test-fns';
import { parse as parseYaml } from 'yaml';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';
import {
  createTestHomeWithSshKey,
  getTestSshAgeIdentity,
  getTestSshAgeRecipient,
} from '@src/.test/infra';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { generateAgeKeyPair } from './adapters/ageRecipientCrypto';
import { delKeyrackKeyHost } from './delKeyrackKeyHost';
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
    const testRecipient = getTestSshAgeRecipient;
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
        pubkey: await testRecipient(),
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
            getOne: async () => getTestSshAgeIdentity(),
            getAll: {
              discovered: async () => [await getTestSshAgeIdentity()],
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
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
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
    const testRecipient = getTestSshAgeRecipient;
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
        pubkey: await testRecipient(),
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
            getOne: async () => getTestSshAgeIdentity(),
            getAll: {
              discovered: async () => [await getTestSshAgeIdentity()],
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
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
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
    const testRecipient = getTestSshAgeRecipient;

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await testRecipient(),
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
            getOne: async () => getTestSshAgeIdentity(),
            getAll: {
              discovered: async () => [await getTestSshAgeIdentity()],
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
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
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

  given('[case4] set with meta for os.secure', () => {
    const testRecipient = getTestSshAgeRecipient;
    // separate keypair for vault recipient (different from manifest recipient)
    const vaultKeyPair = useBeforeAll(async () => generateAgeKeyPair());

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await testRecipient(),
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

    when('[t0] set called with meta', () => {
      then('stores meta in KeyrackKeyHost', async () => {
        const context: ContextKeyrack = {
          owner: 'case4',
          identity: {
            getOne: async () => getTestSshAgeIdentity(),
            getAll: {
              discovered: async () => [await getTestSshAgeIdentity()],
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
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
        };

        const result = await setKeyrackKeyHost(
          {
            slug: 'ehmpathy.sudo.SECURE_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.secure',
            env: 'sudo',
            org: '@this',
            meta: { ageKeyRecipient: vaultKeyPair.recipient },
          },
          context,
        );

        expect(result.meta).toEqual({
          ageKeyRecipient: vaultKeyPair.recipient,
        });

        // verify stored in host manifest - dao discovers key naturally
        const contextForGet = genContextKeyrack({ owner: 'case4' });
        const manifestAfter = await daoKeyrackHostManifest.get(
          {
            owner: 'case4',
          },
          contextForGet,
        );
        const host = manifestAfter?.manifest.hosts['ehmpathy.sudo.SECURE_KEY'];
        expect(host?.meta).toEqual({ ageKeyRecipient: vaultKeyPair.recipient });
      });
    });
  });

  given('[case5] set with maxDuration', () => {
    const testRecipient = getTestSshAgeRecipient;

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await testRecipient(),
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
            getOne: async () => getTestSshAgeIdentity(),
            getAll: {
              discovered: async () => [await getTestSshAgeIdentity()],
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
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
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
    const testRecipient = getTestSshAgeRecipient;
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
        pubkey: await testRecipient(),
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
            getOne: async () => getTestSshAgeIdentity(),
            getAll: {
              discovered: async () => [await getTestSshAgeIdentity()],
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
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
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

  given('[case7] set creates inventory entry', () => {
    const testRecipient = getTestSshAgeRecipient;

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await testRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case7.age',
          owner: 'case7',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] set called with non-ephemeral vault', () => {
      then('creates inventory .stocked file', async () => {
        const context: ContextKeyrack = {
          owner: 'case7',
          identity: {
            getOne: async () => getTestSshAgeIdentity(),
            getAll: {
              discovered: async () => [await getTestSshAgeIdentity()],
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
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
        };

        await setKeyrackKeyHost(
          {
            slug: 'ehmpathy.sudo.INVENTORY_TEST',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: '@this',
          },
          context,
        );

        // verify inventory file was created
        const inventoryDir = join(
          testHome.path,
          '.rhachet',
          'keyrack',
          'inventory',
          'owner=case7',
        );
        expect(existsSync(inventoryDir)).toBe(true);

        // find .stocked file
        const files = readdirSync(inventoryDir);
        const stockedFile = files.find((f: string) => f.endsWith('.stocked'));
        expect(stockedFile).toBeDefined();

        // verify file is empty (security: no key→persistence leak)
        const content = readFileSync(join(inventoryDir, stockedFile!), 'utf8');
        expect(content).toEqual('');

        // verify file permissions (0o600)
        const stats = statSync(join(inventoryDir, stockedFile!));
        const permissions = stats.mode & 0o777;
        expect(permissions).toEqual(0o600);
      });
    });
  });

  given('[case8] del removes inventory entry', () => {
    const testRecipient = getTestSshAgeRecipient;

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await testRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case8.age',
          owner: 'case8',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] del called after set', () => {
      then('removes inventory .stocked file', async () => {
        const context: ContextKeyrack = {
          owner: 'case8',
          identity: {
            getOne: async () => getTestSshAgeIdentity(),
            getAll: {
              discovered: async () => [await getTestSshAgeIdentity()],
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
            'aws.params': genMockVaultAdapter(),
            'github.secrets': genMockVaultAdapter(),
          },
        };

        // set key first (creates inventory entry)
        await setKeyrackKeyHost(
          {
            slug: 'ehmpathy.sudo.INVENTORY_DEL_TEST',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'sudo',
            org: '@this',
          },
          context,
        );

        // verify inventory file was created
        const inventoryDir = join(
          testHome.path,
          '.rhachet',
          'keyrack',
          'inventory',
          'owner=case8',
        );
        expect(existsSync(inventoryDir)).toBe(true);
        const filesBefore = readdirSync(inventoryDir);
        const stockedFileBefore = filesBefore.find((f: string) =>
          f.endsWith('.stocked'),
        );
        expect(stockedFileBefore).toBeDefined();

        // re-fetch manifest after set (delKeyrackKeyHost needs updated manifest)
        const contextForGet = genContextKeyrack({ owner: 'case8' });
        const manifestAfter = await daoKeyrackHostManifest.get(
          { owner: 'case8' },
          contextForGet,
        );

        // del key (should remove inventory entry)
        const contextForDel: ContextKeyrack = {
          ...context,
          hostManifest: manifestAfter?.manifest ?? undefined,
        };
        await delKeyrackKeyHost(
          { slug: 'ehmpathy.sudo.INVENTORY_DEL_TEST' },
          contextForDel,
        );

        // verify inventory file was removed
        const filesAfter = readdirSync(inventoryDir);
        const stockedFileAfter = filesAfter.find((f: string) =>
          f.endsWith('.stocked'),
        );
        expect(stockedFileAfter).toBeUndefined();
      });
    });
  });

  /**
   * .what = binds e8 + e9 at the PERSISTED layer — the encrypted host manifest on disk
   * .why = the daemon's store is in-memory, so its coexistence clamp survives no restart.
   *        the host manifest is where a key CONFIGURATION durably lives, keyed by address,
   *        and it round-trips through age encrypt/decrypt. were the address to collide or
   *        the reach to be dropped on write, a human would set a key per account and find
   *        one of them gone the next time they looked
   */
  given('[case9] one slug set at several reaches', () => {
    const testRecipient = getTestSshAgeRecipient;
    const SLUG = 'ehmpathy.sudo.ANTHROPIC_API_KEY';

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await testRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case9.age',
          owner: 'case9',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] the reachless key and two reach-keys are all set', () => {
      const genContext = (): ContextKeyrack => ({
        owner: 'case9',
        identity: {
          getOne: async () => getTestSshAgeIdentity(),
          getAll: {
            discovered: async () => [await getTestSshAgeIdentity()],
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
          'aws.params': genMockVaultAdapter(),
          'github.secrets': genMockVaultAdapter(),
        },
      });

      then('e8 + e9: all three survive the encrypt round trip', async () => {
        // set the reachless key first, exactly as a repo does today
        await setKeyrackKeyHost(
          {
            slug: SLUG,
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.secure',
            env: 'sudo',
            org: '@this',
          },
          genContext(),
        );

        // then one key per claude account — the os.secure juggle
        for (const exid of ['beav@ehmpathy.com', 'vlad@ehmpathy.com']) {
          const priorManifest = await daoKeyrackHostManifest.get(
            { owner: 'case9' },
            genContextKeyrack({ owner: 'case9' }),
          );
          await setKeyrackKeyHost(
            {
              slug: SLUG,
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.secure',
              env: 'sudo',
              org: '@this',
              reach: { exid },
            },
            {
              ...genContext(),
              hostManifest: priorManifest?.manifest ?? undefined,
            },
          );
        }

        // decrypt from disk and read back what actually persisted
        const after = await daoKeyrackHostManifest.get(
          { owner: 'case9' },
          genContextKeyrack({ owner: 'case9' }),
        );
        const hosts = after?.manifest.hosts ?? {};

        // three distinct addresses, none evicted by another (e8, e9)
        expect(hosts[SLUG]).toBeDefined();
        expect(hosts[`${SLUG}@beav@ehmpathy.com`]).toBeDefined();
        expect(hosts[`${SLUG}@vlad@ehmpathy.com`]).toBeDefined();

        // e1: the reachless entry keys as its BARE slug and carries no reach, so an
        // extant manifest parses byte-identically
        expect(hosts[SLUG]?.reach).toBeUndefined();

        // each reach-key carries its own exid, and all three share one slug
        expect(hosts[`${SLUG}@beav@ehmpathy.com`]?.reach?.exid).toEqual(
          'beav@ehmpathy.com',
        );
        expect(hosts[`${SLUG}@vlad@ehmpathy.com`]?.reach?.exid).toEqual(
          'vlad@ehmpathy.com',
        );
        expect(hosts[`${SLUG}@beav@ehmpathy.com`]?.slug).toEqual(SLUG);
        expect(hosts[`${SLUG}@vlad@ehmpathy.com`]?.slug).toEqual(SLUG);
      });
    });
  });

  /**
   * .what = the DESTROY half of the reach axis, through real encrypt/decrypt on disk
   * .why = `[case9]` proves three reaches can be created and coexist. it makes no claim
   *        about whether one can ever be removed — and until now, one could not:
   *        `delKeyrackKeyHost` addressed `hosts[slug]` by the BARE slug, so
   *          - a key cut only for a reach reported `not_found` while its credential
   *            sat on disk, unreachable and undeletable, forever
   *          - a slug holding both a reachless key and reach peers lost only the reachless
   *            one, with no signal that the peers were left behind
   *        reach was threaded thoroughly through create and read and never swept through
   *        destroy. this clamps the sweep
   */
  given('[case10] one reach deleted from a slug that holds three', () => {
    const testRecipient = getTestSshAgeRecipient;
    const SLUG = 'ehmpathy.sudo.ANTHROPIC_API_KEY';

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await testRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case10.age',
          owner: 'case10',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    when('[t0] del names one of the three addresses', () => {
      const genContext = (): ContextKeyrack => ({
        owner: 'case10',
        identity: {
          getOne: async () => getTestSshAgeIdentity(),
          getAll: {
            discovered: async () => [await getTestSshAgeIdentity()],
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
          'aws.params': genMockVaultAdapter(),
          'github.secrets': genMockVaultAdapter(),
        },
      });

      /**
       * .what = provisions the same three addresses `[case9]` builds
       * .why = the delete only means something against a rack that holds peers
       */
      const genRackOfThree = async (): Promise<void> => {
        await setKeyrackKeyHost(
          {
            slug: SLUG,
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.secure',
            env: 'sudo',
            org: '@this',
          },
          genContext(),
        );
        for (const exid of ['beav@ehmpathy.com', 'vlad@ehmpathy.com']) {
          const priorManifest = await daoKeyrackHostManifest.get(
            { owner: 'case10' },
            genContextKeyrack({ owner: 'case10' }),
          );
          await setKeyrackKeyHost(
            {
              slug: SLUG,
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.secure',
              env: 'sudo',
              org: '@this',
              reach: { exid },
            },
            {
              ...genContext(),
              hostManifest: priorManifest?.manifest ?? undefined,
            },
          );
        }
      };

      then('it removes that one and leaves its two peers intact', async () => {
        await genRackOfThree();

        // delete ONE reach, by name
        const priorManifest = await daoKeyrackHostManifest.get(
          { owner: 'case10' },
          genContextKeyrack({ owner: 'case10' }),
        );
        const result = await delKeyrackKeyHost(
          { slug: SLUG, reach: { exid: 'beav@ehmpathy.com' } },
          {
            ...genContext(),
            hostManifest: priorManifest?.manifest ?? undefined,
          },
        );

        // it FOUND the key — addressed by the bare slug it would have reported not_found
        expect(result.effect).toEqual('deleted');

        // read back from disk through a real decrypt
        const after = await daoKeyrackHostManifest.get(
          { owner: 'case10' },
          genContextKeyrack({ owner: 'case10' }),
        );
        const hosts = after?.manifest.hosts ?? {};

        // the named reach is gone
        expect(hosts[`${SLUG}@beav@ehmpathy.com`]).toBeUndefined();

        // and NEITHER peer went with it — a del is addressed, not a sweep (contrast q1's
        // relock, which deliberately takes every reach of a slug)
        expect(hosts[SLUG]).toBeDefined();
        expect(hosts[`${SLUG}@vlad@ehmpathy.com`]).toBeDefined();
        expect(hosts[`${SLUG}@vlad@ehmpathy.com`]?.reach?.exid).toEqual(
          'vlad@ehmpathy.com',
        );
      });
    });
  });

  /**
   * .what = binds q8's line — a REACH set never declares the key in the repo's keyrack.yml,
   *         while a reachless set still does, exactly as today (e1)
   * .why = a repo manifest states what the REPO needs: a floor every developer here must
   *        fill. a reach is a property of the HUMAN at the machine (someone works
   *        ahbode↔whodis, someone else ahbode↔ehmpathy), so a reach set that wrote a
   *        `keyrack.yml` line would conscript every other developer into a reach they
   *        have no business in — and the wish's `.scope` forbids a keyrack command to
   *        mutate a repo manifest at all
   * .note = the symmetry with `delKeyrackKeyHost` is why this is a blocker and not a
   *         nitpick: `del` already guards its strip with `!input.reach` and its comment
   *         ASSERTS that set declines to write. a set that writes what a del refuses to
   *         strip would leave an orphan declaration behind on every reach del
   *
   * ⚠️ .why INTEGRATION, not unit = this claim was first written as a unit A/B that spied on
   *         a `jest.mock`ed `daoKeyrackRepoManifest` and asserted `not.toHaveBeenCalled()`.
   *         that mock crossed a remote boundary in a `.test.ts`
   *         (`rule.forbid.unit.remote-boundaries`), and it also proved the weaker fact: that
   *         a FUNCTION was not called, rather than that the FILE holds no such line. here the
   *         `keyrack.yml` is real, on disk, and read back through the same `parseYaml` the
   *         reachless twin at `[case2]` uses — so the assertion lands on the artifact a
   *         human would open, which is what the rule actually protects
   */
  given('[case11] a repo whose keyrack.yml a set could write into', () => {
    const testRecipient = getTestSshAgeRecipient;

    const repo = useBeforeAll(async () => {
      const root = join(testHome.path, 'repo-case11');
      mkdirSync(join(root, '.agent'), { recursive: true });
      writeFileSync(
        join(root, '.agent', 'keyrack.yml'),
        'org: ehmpathy\nenv.test: []\n',
        'utf8',
      );
      return { path: root };
    });

    const manifest = useBeforeAll(async () => {
      const recipient = new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: await testRecipient(),
        label: 'test-key',
        addedAt: new Date().toISOString(),
      });

      return daoKeyrackHostManifest.set({
        findsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack/keyrack.host.case11.age',
          owner: 'case11',
          recipients: [recipient],
          hosts: {},
        }),
      });
    });

    /**
     * .what = reads the repo's real keyrack.yml and returns every key it declares
     * .why = the two arms below differ ONLY by `reach`, so they must be judged by the same
     *        instrument — a per-arm bespoke read could pass by a different question
     */
    const getAllDeclaredKeys = (): string[] => {
      const content = readFileSync(
        join(repo.path, '.agent', 'keyrack.yml'),
        'utf8',
      );
      const parsed = parseYaml(content) as Record<string, unknown>;
      return Object.entries(parsed)
        .filter(([key]) => key.startsWith('env.'))
        .flatMap(([, value]) => (Array.isArray(value) ? value : []))
        .map((entry) => String(entry));
    };

    const genContext = (): ContextKeyrack => ({
      owner: 'case11',
      identity: {
        getOne: async () => getTestSshAgeIdentity(),
        getAll: {
          discovered: async () => [await getTestSshAgeIdentity()],
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
        'aws.params': genMockVaultAdapter(),
        'github.secrets': genMockVaultAdapter(),
      },
    });

    when(
      '[t0] a reachless set runs — the case that predates this feature',
      () => {
        then('the key IS declared in keyrack.yml, unchanged (e1)', async () => {
          await setKeyrackKeyHost(
            {
              slug: 'ehmpathy.test.REACHLESS_DECL_KEY',
              mech: 'PERMANENT_VIA_REPLICA',
              vault: 'os.direct',
              env: 'test',
              org: '@this',
            },
            genContext(),
          );

          expect(getAllDeclaredKeys()).toContain('REACHLESS_DECL_KEY');
        });
      },
    );

    when('[t1] the SAME set runs, with a reach named', () => {
      then('no key is declared — the human owns that line', async () => {
        const priorManifest = await daoKeyrackHostManifest.get(
          { owner: 'case11' },
          genContextKeyrack({ owner: 'case11' }),
        );

        await setKeyrackKeyHost(
          {
            slug: 'ehmpathy.test.REACHED_DECL_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            vault: 'os.direct',
            env: 'test',
            org: '@this',
            reach: { exid: 'beav@ehmpathy.com' },
          },
          {
            ...genContext(),
            hostManifest: priorManifest?.manifest ?? undefined,
          },
        );

        // ⚠️ THE clamp. under the defect this key joins `env.test`, and a repo that never
        //    asked for it now demands it of every developer as a REACHLESS requirement
        expect(getAllDeclaredKeys()).not.toContain('REACHED_DECL_KEY');
      });

      // .note = the negative above is only meaningful beside a positive on the same read.
      //         were the file unreadable, or the yaml reshaped, `not.toContain` would pass
      //         for a reason that has no relation to reach (`rule.forbid.failhide`)
      then(
        'and [t0]’s reachless key is still there — the read still works',
        () => {
          expect(getAllDeclaredKeys()).toContain('REACHLESS_DECL_KEY');
        },
      );

      // the key itself DID land on the host — it is the repo declaration that is withheld,
      // never the credential. absent this, [t1] would also pass had the set simply failed
      then('the reach is on the host rack regardless', async () => {
        const after = await daoKeyrackHostManifest.get(
          { owner: 'case11' },
          genContextKeyrack({ owner: 'case11' }),
        );
        expect(
          after?.manifest.hosts[
            'ehmpathy.test.REACHED_DECL_KEY@beav@ehmpathy.com'
          ],
        ).toBeDefined();
      });
    });
  });
});
