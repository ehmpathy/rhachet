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
});
