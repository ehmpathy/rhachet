import { given, then, when } from 'test-fns';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { withTempHome } from '../../.test/infra/withTempHome';
import { daoKeyrackHostManifest } from '../../access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyHost,
} from '../../domain.objects/keyrack';
import { vaultAdapterOsDirect } from './adapters/vaults/vaultAdapterOsDirect';
import { genKeyrackGrantContext } from './genKeyrackGrantContext';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

describe('getKeyrackKeyGrant', () => {
  const tempHome = withTempHome({ name: 'getKeyrackKeyGrant' });
  const testDir = resolve(__dirname, './.temp/getKeyrackKeyGrant');

  beforeAll(() => {
    tempHome.setup();
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    tempHome.teardown();
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // clean up between tests
    rmSync(join(tempHome.path, '.rhachet'), { recursive: true, force: true });
    rmSync(join(testDir, '.agent'), { recursive: true, force: true });
  });

  given('[case1] key configured in repo and host with value in vault', () => {
    beforeEach(async () => {
      // setup repo manifest
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `keys:
  __TEST_HOST_API_KEY__:
    mech: REPLICA
`,
      );

      // setup host manifest
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {
            __TEST_HOST_API_KEY__: new KeyrackKeyHost({
              slug: '__TEST_HOST_API_KEY__',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        }),
      });

      // store value in vault
      await vaultAdapterOsDirect.set({
        slug: '__TEST_HOST_API_KEY__',
        value: 'xai-test-key-123',
      });
    });

    when('[t0] get called for single key', () => {
      then('status is granted', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: '__TEST_HOST_API_KEY__' } },
          context,
        );

        expect(result.status).toEqual('granted');
      });

      then('grant value matches stored value', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: '__TEST_HOST_API_KEY__' } },
          context,
        );

        if (result.status === 'granted') {
          expect(result.grant.key.secret).toEqual('xai-test-key-123');
        }
      });
    });

    when('[t1] get called for repo', () => {
      then('returns array with granted status', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { repo: true } },
          context,
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0]?.status).toEqual('granted');
      });
    });
  });

  given('[case2] key not in repo manifest', () => {
    beforeEach(async () => {
      // setup repo manifest without the key
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(join(agentDir, 'keyrack.yml'), 'keys: {}\n');

      // setup host manifest with the key
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {
            __TEST_HOST_API_KEY__: new KeyrackKeyHost({
              slug: '__TEST_HOST_API_KEY__',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        }),
      });
    });

    when('[t0] get called for key not in repo', () => {
      then('status is absent', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: '__TEST_HOST_API_KEY__' } },
          context,
        );

        expect(result.status).toEqual('absent');
      });

      then('message mentions repo manifest', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: '__TEST_HOST_API_KEY__' } },
          context,
        );

        if (result.status === 'absent') {
          expect(result.message).toContain('repo manifest');
        }
      });
    });
  });

  given('[case3] key not configured on host', () => {
    beforeEach(async () => {
      // setup repo manifest with the key
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `keys:
  __TEST_HOST_API_KEY__:
    mech: REPLICA
`,
      );

      // setup empty host manifest
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {},
        }),
      });
    });

    when('[t0] get called for unconfigured key', () => {
      then('status is absent', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: '__TEST_HOST_API_KEY__' } },
          context,
        );

        expect(result.status).toEqual('absent');
      });

      then('message mentions host', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: '__TEST_HOST_API_KEY__' } },
          context,
        );

        if (result.status === 'absent') {
          expect(result.message).toContain('host');
        }
      });

      then('fix instructions mention keyrack set', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: '__TEST_HOST_API_KEY__' } },
          context,
        );

        if (result.status === 'absent') {
          expect(result.fix).toContain('keyrack set');
        }
      });
    });
  });

  given('[case4] value not in vault', () => {
    beforeEach(async () => {
      // setup repo manifest
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `keys:
  __TEST_HOST_API_KEY__:
    mech: REPLICA
`,
      );

      // setup host manifest
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {
            __TEST_HOST_API_KEY__: new KeyrackKeyHost({
              slug: '__TEST_HOST_API_KEY__',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
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
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: '__TEST_HOST_API_KEY__' } },
          context,
        );

        expect(result.status).toEqual('absent');
      });
    });
  });

  given('[case5] invalid credential value', () => {
    beforeEach(async () => {
      // setup repo manifest
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `keys:
  GITHUB_TOKEN:
    mech: REPLICA
`,
      );

      // setup host manifest
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {
            GITHUB_TOKEN: new KeyrackKeyHost({
              slug: 'GITHUB_TOKEN',
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        }),
      });

      // store a long-lived github pat (should be blocked by REPLICA mech)
      await vaultAdapterOsDirect.set({
        slug: 'GITHUB_TOKEN',
        value: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      });
    });

    when('[t0] get called for invalid value', () => {
      then('status is blocked', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: 'GITHUB_TOKEN' } },
          context,
        );

        expect(result.status).toEqual('blocked');
      });

      then('message mentions validation failure', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: 'GITHUB_TOKEN' } },
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
    const envValue = 'ci-passthrough-value-123';

    beforeEach(async () => {
      // set env var
      process.env[envKey] = envValue;

      // setup repo manifest with the key
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `keys:
  ${envKey}:
    mech: REPLICA
`,
      );

      // setup empty host manifest (no host config for this key)
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {},
        }),
      });
    });

    afterEach(() => {
      delete process.env[envKey];
    });

    when('[t0] get called for key that exists in env', () => {
      then('status is granted', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: envKey } },
          context,
        );

        expect(result.status).toEqual('granted');
      });

      then('grant source vault is os.envvar', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: envKey } },
          context,
        );

        if (result.status === 'granted') {
          expect(result.grant.source.vault).toEqual('os.envvar');
        }
      });

      then('grant value matches env value', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: envKey } },
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
    const envValue = 'value-from-env';
    const hostValue = 'value-from-host';

    beforeEach(async () => {
      // set env var
      process.env[envKey] = envValue;

      // setup repo manifest
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `keys:
  ${envKey}:
    mech: REPLICA
`,
      );

      // setup host manifest with different value
      await daoKeyrackHostManifest.set({
        upsert: new KeyrackHostManifest({
          uri: '~/.rhachet/keyrack.manifest.json',
          hosts: {
            [envKey]: new KeyrackKeyHost({
              slug: envKey,
              mech: 'REPLICA',
              vault: 'os.direct',
              exid: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        }),
      });

      // store different value in vault
      await vaultAdapterOsDirect.set({
        slug: envKey,
        value: hostValue,
      });
    });

    afterEach(() => {
      delete process.env[envKey];
    });

    when('[t0] get called for key', () => {
      then('env takes precedence over host', async () => {
        const context = await genKeyrackGrantContext({ gitroot: testDir });
        const result = await getKeyrackKeyGrant(
          { for: { key: envKey } },
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
