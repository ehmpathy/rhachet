import { given, then, when } from 'test-fns';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withTempHome } from '../../.test/infra/withTempHome';
import { daoKeyrackHostManifest } from '../../access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyHost,
  KeyrackKeyRecipient,
} from '../../domain.objects/keyrack';
import { generateAgeKeyPair } from './adapters/ageRecipientCrypto';
import { vaultAdapterOsDirect } from './adapters/vaults/vaultAdapterOsDirect';
import { genKeyrackGrantContext } from './genKeyrackGrantContext';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

/**
 * .what = generate test key pair for age encryption
 * .why = integration tests need identity for manifest encryption/decryption
 */
let testKeyPair: { identity: string; recipient: string };
let TEST_RECIPIENT: KeyrackKeyRecipient;

describe('getKeyrackKeyGrant', () => {
  const tempHome = withTempHome({ name: 'getKeyrackKeyGrant' });
  const testDir = resolve(__dirname, './.temp/getKeyrackKeyGrant');

  beforeAll(async () => {
    tempHome.setup();
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });

    // generate key pair for test encryption/decryption
    testKeyPair = await generateAgeKeyPair();
    TEST_RECIPIENT = new KeyrackKeyRecipient({
      mech: 'age',
      pubkey: testKeyPair.recipient,
      label: 'test',
      addedAt: new Date().toISOString(),
    });
  });

  afterAll(() => {
    tempHome.teardown();
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // clean up between tests
    rmSync(join(tempHome.path, '.rhachet'), { recursive: true, force: true });
    rmSync(join(testDir, '.agent'), { recursive: true, force: true });

    // set session identity for manifest encryption/decryption
    daoKeyrackHostManifest.setSessionIdentity(testKeyPair.identity);
  });

  given('[case1] key configured in repo and host with value in vault', () => {
    const slug = 'testorg.test.__TEST_HOST_API_KEY__';

    beforeEach(async () => {
      // setup repo manifest
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.all:
  - __TEST_HOST_API_KEY__

env.test: []
`,
      );

      // setup host manifest
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          owner: null,
          recipients: [TEST_RECIPIENT],
          hosts: {
            [slug]: new KeyrackKeyHost({
              slug,
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'all',
              org: 'testorg',
              vaultRecipient: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        }),
      });

      // store value in vault
      await vaultAdapterOsDirect.set({
        slug,
        value: 'xai-test-key-123',
        env: 'test',
        org: 'testorg',
      });
    });

    when('[t0] get called for single key', () => {
      then('status is granted', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        expect(result.status).toEqual('granted');
      });

      then('grant value matches stored value', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual('xai-test-key-123');
        }
      });
    });

    when('[t1] get called for repo', () => {
      then('returns array with granted status', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { repo: true }, env: 'test' },
          context,
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0]?.status).toEqual('granted');
      });
    });
  });

  given('[case2] key not in repo manifest', () => {
    const slug = 'testorg.test.__TEST_HOST_API_KEY__';

    beforeEach(async () => {
      // setup repo manifest without the key
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.all: []

env.test: []
`,
      );

      // setup host manifest with the key
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          owner: null,
          recipients: [TEST_RECIPIENT],
          hosts: {
            [slug]: new KeyrackKeyHost({
              slug,
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'all',
              org: 'testorg',
              vaultRecipient: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        }),
      });
    });

    when('[t0] get called for key not in repo', () => {
      then('status is absent', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        expect(result.status).toEqual('absent');
      });

      then('message mentions repo manifest', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        if (result.status === 'absent') {
          expect(result.message).toContain('repo manifest');
        }
      });
    });
  });

  given('[case3] key not configured on host', () => {
    const slug = 'testorg.test.__TEST_HOST_API_KEY__';

    beforeEach(async () => {
      // setup repo manifest with the key
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.all:
  - __TEST_HOST_API_KEY__

env.test: []
`,
      );

      // setup empty host manifest
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          owner: null,
          recipients: [TEST_RECIPIENT],
          hosts: {},
        }),
      });
    });

    when('[t0] get called for unconfigured key', () => {
      then('status is absent', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        expect(result.status).toEqual('absent');
      });

      then('message mentions host', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        if (result.status === 'absent') {
          expect(result.message).toContain('host');
        }
      });

      then('fix instructions mention keyrack set', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        if (result.status === 'absent') {
          expect(result.fix).toContain('keyrack set');
        }
      });
    });
  });

  given('[case4] value not in vault', () => {
    const slug = 'testorg.test.__TEST_HOST_API_KEY__';

    beforeEach(async () => {
      // setup repo manifest
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.all:
  - __TEST_HOST_API_KEY__

env.test: []
`,
      );

      // setup host manifest
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          owner: null,
          recipients: [TEST_RECIPIENT],
          hosts: {
            [slug]: new KeyrackKeyHost({
              slug,
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'all',
              org: 'testorg',
              vaultRecipient: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        }),
      });

      // do NOT store value in vault
    });

    when('[t0] get called for key without value', () => {
      then('status is absent', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        expect(result.status).toEqual('absent');
      });
    });
  });

  given('[case5] invalid credential value', () => {
    const slug = 'testorg.test.GITHUB_TOKEN';

    beforeEach(async () => {
      // setup repo manifest
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.all:
  - GITHUB_TOKEN

env.test: []
`,
      );

      // setup host manifest
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          owner: null,
          recipients: [TEST_RECIPIENT],
          hosts: {
            [slug]: new KeyrackKeyHost({
              slug,
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'all',
              org: 'testorg',
              vaultRecipient: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        }),
      });

      // store a long-lived github pat (should be blocked by REPLICA mech)
      await vaultAdapterOsDirect.set({
        slug,
        value: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        env: 'test',
        org: 'testorg',
      });
    });

    when('[t0] get called for invalid value', () => {
      then('status is blocked', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        expect(result.status).toEqual('blocked');
      });

      then('message mentions validation failure', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        if (result.status === 'blocked') {
          expect(result.message).toContain('github classic pat');
        }
      });
    });
  });

  given('[case6] key present in process.env (ci passthrough)', () => {
    const envKey = '__TEST_KEYRACK_INTEG_ENV_VAR__';
    const slug = `testorg.test.${envKey}`;
    const envValue = 'ci-passthrough-value-123';

    beforeEach(async () => {
      // set env var (uses raw key name for passthrough lookup)
      process.env[envKey] = envValue;

      // setup repo manifest with the key
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.all:
  - ${envKey}

env.test: []
`,
      );

      // setup empty host manifest (no host config for this key)
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          owner: null,
          recipients: [TEST_RECIPIENT],
          hosts: {},
        }),
      });
    });

    afterEach(() => {
      delete process.env[envKey];
    });

    when('[t0] get called for key that exists in env', () => {
      then('status is granted', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        expect(result.status).toEqual('granted');
      });

      then('grant source vault is os.envvar', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        if (result.status === 'granted') {
          expect(result.grant.source.vault).toEqual('os.envvar');
        }
      });

      then('grant value matches env value', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual(envValue);
        }
      });
    });
  });

  given('[case7] key in both env and host manifest (env wins)', () => {
    const envKey = '__TEST_KEYRACK_INTEG_ENV_PRIORITY__';
    const slug = `testorg.test.${envKey}`;
    const envValue = 'value-from-env';
    const hostValue = 'value-from-host';

    beforeEach(async () => {
      // set env var (uses raw key name for passthrough lookup)
      process.env[envKey] = envValue;

      // setup repo manifest
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.all:
  - ${envKey}

env.test: []
`,
      );

      // setup host manifest with different value
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          owner: null,
          recipients: [TEST_RECIPIENT],
          hosts: {
            [slug]: new KeyrackKeyHost({
              slug,
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              env: 'all',
              org: 'testorg',
              vaultRecipient: null,
              maxDuration: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        }),
      });

      // store different value in vault
      await vaultAdapterOsDirect.set({
        slug,
        value: hostValue,
        env: 'test',
        org: 'testorg',
      });
    });

    afterEach(() => {
      delete process.env[envKey];
    });

    when('[t0] get called for key', () => {
      then('env takes precedence over host', async () => {
        const context = await genKeyrackGrantContext({
          owner: null,
          gitroot: testDir,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        expect(result.status).toEqual('granted');
        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual(envValue);
          expect(result.grant.source.vault).toEqual('os.envvar');
        }
      });
    });
  });
});
