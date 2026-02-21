import { getError, given, then, when } from 'test-fns';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { daoKeyrackRepoManifest } from './index';

describe('daoKeyrackRepoManifest', () => {
  const testDir = resolve(__dirname, './.temp/daoKeyrackRepoManifest');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // clean .agent directory before each test
    rmSync(join(testDir, '.agent'), { recursive: true, force: true });
  });

  given('[case1] no keyrack.yml exists', () => {
    when('[t0] get called', () => {
      then('returns null', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });
        expect(result).toBeNull();
      });
    });
  });

  given('[case2] valid keyrack.yml exists', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.all:
  - XAI_API_KEY: encrypted
  - GITHUB_TOKEN
  - AWS_PROFILE: ephemeral

env.test: []
`,
      );
    });

    when('[t0] get called', () => {
      then('returns parsed manifest', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        expect(result).not.toBeNull();
        // 3 keys in env.all expanded to env.test = 3 keys total
        expect(Object.keys(result!.keys)).toHaveLength(3);
      });

      then('hydrates KeyrackKeySpec domain objects', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        // keys are now slugged with org.env.name format (env.all expands to test)
        expect(result!.keys['testorg.test.XAI_API_KEY']).toBeDefined();
        expect(result!.keys['testorg.test.XAI_API_KEY']?.name).toEqual(
          'XAI_API_KEY',
        );

        expect(result!.keys['testorg.test.GITHUB_TOKEN']).toBeDefined();
        expect(result!.keys['testorg.test.GITHUB_TOKEN']?.name).toEqual(
          'GITHUB_TOKEN',
        );

        expect(result!.keys['testorg.test.AWS_PROFILE']).toBeDefined();
        expect(result!.keys['testorg.test.AWS_PROFILE']?.name).toEqual(
          'AWS_PROFILE',
        );
      });
    });
  });

  given('[case3] keyrack.yml has invalid yaml', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `keys:
  - this is not valid
    yaml: [structure
`,
      );
    });

    when('[t0] get called', () => {
      then('throws error about invalid yaml', async () => {
        const error = await getError(
          daoKeyrackRepoManifest.get({ gitroot: testDir }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('invalid yaml');
      });
    });
  });

  given('[case4] keyrack.yml has invalid schema (org absent)', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `env.all:
  - XAI_API_KEY
`,
      );
    });

    when('[t0] get called', () => {
      then('throws error about invalid schema', async () => {
        const error = await getError(
          daoKeyrackRepoManifest.get({ gitroot: testDir }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('invalid schema');
      });
    });
  });

  given('[case5] keyrack.yml with empty env.all but env-specific keys', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.all: []

env.test:
  - TEST_KEY
`,
      );
    });

    when('[t0] get called', () => {
      then('returns manifest with only env-specific keys', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        expect(result).not.toBeNull();
        expect(Object.keys(result!.keys)).toHaveLength(1);
        expect(result!.keys['testorg.test.TEST_KEY']).toBeDefined();
      });
    });
  });

  given('[case6] set() with valid keyrack.yml', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg

env.prod: []

env.test:
  - OLD_KEY
`,
      );
    });

    when('[t0] set called with new key', () => {
      then('adds key and returns status "added"', async () => {
        await daoKeyrackRepoManifest.set.findsertKeyToEnv({
          gitroot: testDir,
          env: 'test',
          key: 'NEW_KEY',
        });

        // verify key was written
        const manifest = await daoKeyrackRepoManifest.get({ gitroot: testDir });
        expect(manifest!.keys['testorg.test.NEW_KEY']).toBeDefined();
        expect(manifest!.keys['testorg.test.OLD_KEY']).toBeDefined();
      });
    });

    when('[t1] set called with key that already found', () => {
      then('returns status "found" without duplicate', async () => {
        await daoKeyrackRepoManifest.set.findsertKeyToEnv({
          gitroot: testDir,
          env: 'test',
          key: 'OLD_KEY',
        });

        // verify no duplicate
        const manifest = await daoKeyrackRepoManifest.get({ gitroot: testDir });
        const testKeys = Object.keys(manifest!.keys).filter((k) =>
          k.includes('test'),
        );
        expect(testKeys).toHaveLength(1);
      });
    });

    when('[t2] set called for new env section', () => {
      then('creates env section and adds key', async () => {
        await daoKeyrackRepoManifest.set.findsertKeyToEnv({
          gitroot: testDir,
          env: 'prod',
          key: 'PROD_KEY',
        });

        // verify key was written in prod env
        const manifest = await daoKeyrackRepoManifest.get({ gitroot: testDir });
        expect(manifest!.keys['testorg.prod.PROD_KEY']).toBeDefined();
      });
    });
  });

  given('[case7] set() without org in manifest', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `env.test:
  - OLD_KEY
`,
      );
    });

    when('[t0] set called', () => {
      then('throws error about org absent', async () => {
        const error = await getError(
          daoKeyrackRepoManifest.set.findsertKeyToEnv({
            gitroot: testDir,
            env: 'test',
            key: 'NEW_KEY',
          }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('org');
      });
    });
  });
});
