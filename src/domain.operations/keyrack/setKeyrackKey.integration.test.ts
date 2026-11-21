import { given, then, useThen, when } from 'test-fns';

import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';
import { genMockVaultAdapter } from '@src/.test/assets/genMockVaultAdapter';
import {
  createTestHomeWithSshKey,
  getTestSshAgeIdentity,
  getTestSshAgeRecipient,
} from '@src/.test/infra';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';

import { type ContextKeyrack, genContextKeyrack } from './genContextKeyrack';
import { setKeyrackKey } from './setKeyrackKey';

/**
 * .what = gen a keyrack context over a real host manifest in the test home, for one owner
 * .why = setKeyrackKey writes the host manifest and the inventory and relocks the daemon through
 *        the real daos; a per-case owner keeps each case's manifest and daemon socket apart
 */
const genSceneContext = async (input: {
  owner: string;
  vaultAdapters: Partial<ContextKeyrack['vaultAdapters']>;
}): Promise<ContextKeyrack> => {
  const recipient = new KeyrackKeyRecipient({
    mech: 'age',
    pubkey: await getTestSshAgeRecipient(),
    label: 'test-key',
    addedAt: new Date().toISOString(),
  });
  const manifest = await daoKeyrackHostManifest.set({
    findsert: new KeyrackHostManifest({
      uri: `~/.rhachet/keyrack/keyrack.host.${input.owner}.age`,
      owner: input.owner,
      recipients: [recipient],
      hosts: {},
    }),
  });
  return {
    owner: input.owner,
    identity: {
      getOne: async () => getTestSshAgeIdentity(),
      getAll: {
        discovered: async () => [await getTestSshAgeIdentity()],
        prescribed: [],
      },
    },
    hostManifest: manifest,
    repoManifest: null,
    vaultAdapters: {
      'os.envvar': genMockVaultAdapter(),
      'os.direct': genMockVaultAdapter(),
      'os.secure': genMockVaultAdapter(),
      'os.daemon': genMockVaultAdapter(),
      '1password': genMockVaultAdapter(),
      'aws.config': genMockVaultAdapter(),
      'aws.params': genMockVaultAdapter(),
      'github.secrets': genMockVaultAdapter(),
      ...input.vaultAdapters,
    },
  };
};

/**
 * .what = read one host entry back from the real host manifest
 * .why = proves the set persisted, not merely returned
 */
const getHostAfter = async (input: { owner: string; address: string }) => {
  const after = await daoKeyrackHostManifest.get(
    { owner: input.owner },
    genContextKeyrack({ owner: input.owner }),
  );
  return after?.manifest.hosts[input.address] ?? null;
};

describe('setKeyrackKey.integration', () => {
  const testHome = createTestHomeWithSshKey({
    name: 'setKeyrackKey-integration',
  });

  beforeAll(() => testHome.setup());
  afterAll(() => testHome.teardown());

  given('[case1] single env key', () => {
    when('[t0] called with specific env', () => {
      const result = useThen('it succeeds', async () => {
        const context = await genSceneContext({
          owner: 'setkey1',
          vaultAdapters: {},
        });
        const hosts = await setKeyrackKey(
          {
            key: 'MY_KEY',
            env: 'prod',
            org: 'testorg',
            vault: 'os.direct',
            mech: 'PERMANENT_VIA_REPLICA',
            source: null,
          },
          context,
        );
        return { hosts };
      });

      then('it should delegate to setKeyrackKeyHost with correct slug', () => {
        expect(result.hosts).toHaveLength(1);
        expect(result.hosts[0]!).toMatchObject({
          slug: 'testorg.prod.MY_KEY',
          vault: 'os.direct',
          mech: 'PERMANENT_VIA_REPLICA',
        });
      });

      then('the host manifest holds the key', async () => {
        const host = await getHostAfter({
          owner: 'setkey1',
          address: 'testorg.prod.MY_KEY',
        });
        expect(host?.vault).toEqual('os.direct');
      });
    });
  });

  given('[case2] aws.config vault', () => {
    when('[t0] called with aws.config vault and exid', () => {
      const result = useThen('it succeeds', async () => {
        const context = await genSceneContext({
          owner: 'setkey2',
          vaultAdapters: {
            'aws.config': genMockVaultAdapter({
              supportedMechs: ['EPHEMERAL_VIA_AWS_SSO'],
            }),
          },
        });
        const hosts = await setKeyrackKey(
          {
            key: 'AWS_PROFILE',
            env: 'test',
            org: 'ehmpathy',
            vault: 'aws.config',
            mech: 'EPHEMERAL_VIA_AWS_SSO',
            exid: 'test-profile',
            source: null,
          },
          context,
        );
        return { hosts };
      });

      then('it should pass exid through to setKeyrackKeyHost', async () => {
        expect(result.hosts).toHaveLength(1);
        expect(result.hosts[0]!).toMatchObject({
          slug: 'ehmpathy.test.AWS_PROFILE',
          vault: 'aws.config',
          mech: 'EPHEMERAL_VIA_AWS_SSO',
        });
        const host = await getHostAfter({
          owner: 'setkey2',
          address: 'ehmpathy.test.AWS_PROFILE',
        });
        expect(host?.exid).toEqual('test-profile');
      });
    });
  });

  given('[case3] env=all stores single slug', () => {
    when('[t0] called with env=all', () => {
      const result = useThen('it succeeds', async () => {
        const context = await genSceneContext({
          owner: 'setkey3',
          vaultAdapters: {},
        });
        const hosts = await setKeyrackKey(
          {
            key: 'NEW_KEY',
            env: 'all',
            org: 'customorg',
            vault: 'os.direct',
            mech: 'PERMANENT_VIA_REPLICA',
            at: 'custom/role/keyrack.yml',
            source: null,
          },
          context,
        );
        return { hosts };
      });

      then('it should store under $org.all.$key only', async () => {
        // should store exactly ONE slug under $org.all.$key
        expect(result.hosts).toHaveLength(1);
        expect(result.hosts[0]!).toMatchObject({
          slug: 'customorg.all.NEW_KEY',
          vault: 'os.direct',
          mech: 'PERMANENT_VIA_REPLICA',
        });
        const host = await getHostAfter({
          owner: 'setkey3',
          address: 'customorg.all.NEW_KEY',
        });
        expect(host).not.toBeNull();
      });
    });

    when(
      '[t1] called with env=all and repo manifest with multiple envs',
      () => {
        const result = useThen('it succeeds', async () => {
          const context = await genSceneContext({
            owner: 'setkey3b',
            vaultAdapters: {},
          });

          // create repo manifest with multiple envs and prior keys
          const repoManifest = genMockKeyrackRepoManifest({
            org: 'ehmpathy',
            envs: ['prod', 'prep', 'test'],
            keys: {
              'ehmpathy.prod.PRIOR_KEY': { env: 'prod', name: 'PRIOR_KEY' },
              'ehmpathy.prep.PRIOR_KEY': { env: 'prep', name: 'PRIOR_KEY' },
            },
          });

          const hosts = await setKeyrackKey(
            {
              key: 'MY_SECRET',
              env: 'all',
              org: 'ehmpathy',
              vault: 'os.direct',
              mech: 'PERMANENT_VIA_REPLICA',
              source: null,
              repoManifest,
            },
            context,
          );
          return { hosts };
        });

        then('it should NOT expand to multiple slugs', async () => {
          // should NOT expand — should store exactly ONE slug
          expect(result.hosts).toHaveLength(1);
          expect(result.hosts[0]!.slug).toEqual('ehmpathy.all.MY_SECRET');
          // should NOT have prod, prep, or test slugs
          expect(result.hosts.map((r) => r.slug)).not.toContain(
            'ehmpathy.prod.MY_SECRET',
          );
          expect(result.hosts.map((r) => r.slug)).not.toContain(
            'ehmpathy.prep.MY_SECRET',
          );
          expect(result.hosts.map((r) => r.slug)).not.toContain(
            'ehmpathy.test.MY_SECRET',
          );

          // nor did the host manifest gain any env-expanded slug
          const after = await daoKeyrackHostManifest.get(
            { owner: 'setkey3b' },
            genContextKeyrack({ owner: 'setkey3b' }),
          );
          expect(Object.keys(after?.manifest.hosts ?? {})).toEqual([
            'ehmpathy.all.MY_SECRET',
          ]);
        });
      },
    );
  });

  given('[case4] a piped source into os.secure', () => {
    when('[t0] called with a source value', () => {
      // .note = a spy over the injected fake vault, so the value the vault received is read
      const adapterBase = genMockVaultAdapter({ isSourcePipedAccepted: true });
      const vaultSetSpy = jest.fn(adapterBase.set);
      const adapterSpied: KeyrackHostVaultAdapter = {
        ...adapterBase,
        set: vaultSetSpy,
      };

      const result = useThen('it succeeds', async () => {
        const context = await genSceneContext({
          owner: 'setkey4',
          vaultAdapters: { 'os.secure': adapterSpied },
        });
        const hosts = await setKeyrackKey(
          {
            key: 'PIPED_KEY',
            env: 'all',
            org: 'testorg',
            vault: 'os.secure',
            mech: 'PERMANENT_VIA_REPLICA',
            source: 'piped-fixture-value',
          },
          context,
        );
        return { hosts };
      });

      then('the vault receives the source value as given', () => {
        expect(result.hosts[0]!.slug).toEqual('testorg.all.PIPED_KEY');
        expect(vaultSetSpy).toHaveBeenCalledTimes(1);
        expect(vaultSetSpy.mock.calls[0]![0]).toMatchObject({
          slug: 'testorg.all.PIPED_KEY',
          source: 'piped-fixture-value',
        });
      });
    });
  });
});
