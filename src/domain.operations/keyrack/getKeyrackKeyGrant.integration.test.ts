import { given, then, when } from 'test-fns';

import { withTempHome } from '@src/.test/infra/withTempHome';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { genContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

// mock daemon interactions to avoid socket access in integration tests
jest.mock('./daemon/sdk', () => ({
  daemonAccessGet: jest.fn().mockResolvedValue(null),
}));

describe('getKeyrackKeyGrant.integration', () => {
  const tempHome = withTempHome({ name: 'getKeyrackKeyGrant' });
  const testDir = resolve(__dirname, './.temp/getKeyrackKeyGrant');

  beforeAll(async () => {
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

  given(
    '[case1] key configured in repo and host but no envvar or daemon',
    () => {
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
      });

      when('[t0] get called for single key', () => {
        then('status is locked (envvar and daemon miss)', async () => {
          const context = await genContextKeyrackGrantGet({
            gitroot: testDir,
            owner: null,
          });
          const result = await getKeyrackKeyGrant(
            { for: { key: slug } },
            context,
          );

          expect(result.status).toEqual('locked');
        });

        then('fix mentions unlock', async () => {
          const context = await genContextKeyrackGrantGet({
            gitroot: testDir,
            owner: null,
          });
          const result = await getKeyrackKeyGrant(
            { for: { key: slug } },
            context,
          );

          if (result.status === 'locked') {
            expect(result.fix).toContain('unlock');
          }
        });
      });

      when('[t1] get called for repo', () => {
        then('returns array with locked status', async () => {
          const context = await genContextKeyrackGrantGet({
            gitroot: testDir,
            owner: null,
          });

          // resolve slugs from repo manifest (like the CLI does)
          const slugs = context.repoManifest
            ? Object.keys(context.repoManifest.keys)
            : [];

          const result = await getKeyrackKeyGrant(
            { for: { repo: true }, env: 'test', slugs },
            context,
          );

          expect(Array.isArray(result)).toBe(true);
          // env.all key creates both .all. slug and .test. slug = 2 keys
          expect(result).toHaveLength(2);
          expect(result[0]?.status).toEqual('locked');
          expect(result[1]?.status).toEqual('locked');
        });
      });
    },
  );

  given('[case2] key present in process.env (ci passthrough)', () => {
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
    });

    afterEach(() => {
      delete process.env[envKey];
    });

    when('[t0] get called for key that exists in env', () => {
      then('status is granted', async () => {
        const context = await genContextKeyrackGrantGet({
          gitroot: testDir,
          owner: null,
        });
        const result = await getKeyrackKeyGrant(
          { for: { key: slug } },
          context,
        );

        expect(result.status).toEqual('granted');
      });

      then('grant source vault is os.envvar', async () => {
        const context = await genContextKeyrackGrantGet({
          gitroot: testDir,
          owner: null,
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
        const context = await genContextKeyrackGrantGet({
          gitroot: testDir,
          owner: null,
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

  given('[case3] key in env takes precedence over locked vault', () => {
    const envKey = '__TEST_KEYRACK_INTEG_ENV_PRIORITY__';
    const slug = `testorg.test.${envKey}`;
    const envValue = 'value-from-env';

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
    });

    afterEach(() => {
      delete process.env[envKey];
    });

    when('[t0] get called for key', () => {
      then('env takes precedence over vault', async () => {
        const context = await genContextKeyrackGrantGet({
          gitroot: testDir,
          owner: null,
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
