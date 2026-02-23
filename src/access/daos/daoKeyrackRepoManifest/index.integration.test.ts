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
        // 3 keys in env.all create .all. slugs (3) + expand to env.test (3) = 6 keys total
        expect(Object.keys(result!.keys)).toHaveLength(6);
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

  given('[case8] keyrack.yml with extends', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      const roleDir = join(agentDir, 'repo=test-repo/role=tester');
      mkdirSync(roleDir, { recursive: true });

      // role keyrack (extended)
      writeFileSync(
        join(roleDir, 'keyrack.yml'),
        `org: testorg
env.test:
  - ROLE_KEY
`,
      );

      // root keyrack with extends
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg
extends:
  - .agent/repo=test-repo/role=tester/keyrack.yml
env.test:
  - LOCAL_KEY
`,
      );
    });

    when('[t0] get called', () => {
      then('returns merged keys from both manifests', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        expect(result).not.toBeNull();
        // both LOCAL_KEY and ROLE_KEY should be present
        expect(result!.keys['testorg.test.LOCAL_KEY']).toBeDefined();
        expect(result!.keys['testorg.test.ROLE_KEY']).toBeDefined();
      });

      then('includes extends in manifest for debug', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        expect(result!.extends).toBeDefined();
        expect(result!.extends).toContain(
          '.agent/repo=test-repo/role=tester/keyrack.yml',
        );
      });
    });
  });

  given('[case9] keyrack.yml with circular extends', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      const pathA = join(agentDir, 'pathA');
      const pathB = join(agentDir, 'pathB');
      mkdirSync(pathA, { recursive: true });
      mkdirSync(pathB, { recursive: true });

      // pathA extends pathB
      writeFileSync(
        join(pathA, 'keyrack.yml'),
        `org: testorg
extends:
  - .agent/pathB/keyrack.yml
env.test:
  - PATH_A_KEY
`,
      );

      // pathB extends pathA (circular!)
      writeFileSync(
        join(pathB, 'keyrack.yml'),
        `org: testorg
extends:
  - .agent/pathA/keyrack.yml
env.test:
  - PATH_B_KEY
`,
      );

      // root extends pathA
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg
extends:
  - .agent/pathA/keyrack.yml
env.test:
  - ROOT_KEY
`,
      );
    });

    when('[t0] get called', () => {
      then('throws error about circular extends', async () => {
        const error = await getError(
          daoKeyrackRepoManifest.get({ gitroot: testDir }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('circular extends');
      });
    });
  });

  given('[case10] keyrack.yml with recursive extends', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      const pathA = join(agentDir, 'pathA');
      const pathB = join(agentDir, 'pathB');
      mkdirSync(pathA, { recursive: true });
      mkdirSync(pathB, { recursive: true });

      // pathB has deep key (no extends)
      writeFileSync(
        join(pathB, 'keyrack.yml'),
        `org: testorg
env.test:
  - DEEP_KEY
`,
      );

      // pathA extends pathB
      writeFileSync(
        join(pathA, 'keyrack.yml'),
        `org: testorg
extends:
  - .agent/pathB/keyrack.yml
env.test:
  - PATH_A_KEY
`,
      );

      // root extends pathA
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg
extends:
  - .agent/pathA/keyrack.yml
env.test:
  - ROOT_KEY
`,
      );
    });

    when('[t0] get called', () => {
      then('returns keys from entire extends chain', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        expect(result).not.toBeNull();
        // all keys from the chain should be present
        expect(result!.keys['testorg.test.ROOT_KEY']).toBeDefined();
        expect(result!.keys['testorg.test.PATH_A_KEY']).toBeDefined();
        expect(result!.keys['testorg.test.DEEP_KEY']).toBeDefined();
      });
    });
  });

  given('[case11] keyrack.yml extends non-extant file', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });

      // root extends non-extant file
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg
extends:
  - .agent/does-not-exist/keyrack.yml
env.test:
  - ROOT_KEY
`,
      );
    });

    when('[t0] get called', () => {
      then('throws error about extended keyrack not found', async () => {
        const error = await getError(
          daoKeyrackRepoManifest.get({ gitroot: testDir }),
        );
        expect(error).toBeDefined();
        expect(error?.message).toContain('extended keyrack not found');
      });
    });
  });

  given('[case12] extends with key override (root wins)', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      const roleDir = join(agentDir, 'repo=test-repo/role=tester');
      mkdirSync(roleDir, { recursive: true });

      // role keyrack declares SHARED_KEY
      writeFileSync(
        join(roleDir, 'keyrack.yml'),
        `org: testorg
env.test:
  - SHARED_KEY: encrypted
`,
      );

      // root keyrack also declares SHARED_KEY (should override)
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `org: testorg
extends:
  - .agent/repo=test-repo/role=tester/keyrack.yml
env.test:
  - SHARED_KEY: ephemeral
`,
      );
    });

    when('[t0] get called', () => {
      then('root key spec overrides extended key spec', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        expect(result).not.toBeNull();
        const sharedKey = result!.keys['testorg.test.SHARED_KEY'];
        expect(sharedKey).toBeDefined();
        // root declares ephemeral, extended declares encrypted
        // root should win
        expect(sharedKey?.grade?.duration).toEqual('ephemeral');
        expect(sharedKey?.grade?.protection).toBeNull();
      });
    });
  });
});
