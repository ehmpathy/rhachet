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
        `keys:
  XAI_API_KEY:
    mech: REPLICA
  GITHUB_TOKEN:
    mech: GITHUB_APP
  AWS_PROFILE:
    mech: AWS_SSO
`,
      );
    });

    when('[t0] get called', () => {
      then('returns parsed manifest', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        expect(result).not.toBeNull();
        expect(Object.keys(result!.keys)).toHaveLength(3);
      });

      then('hydrates KeyrackKeySpec domain objects', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        expect(result!.keys.XAI_API_KEY).toBeDefined();
        expect(result!.keys.XAI_API_KEY?.mech).toEqual('REPLICA');

        expect(result!.keys.GITHUB_TOKEN).toBeDefined();
        expect(result!.keys.GITHUB_TOKEN?.mech).toEqual('GITHUB_APP');

        expect(result!.keys.AWS_PROFILE).toBeDefined();
        expect(result!.keys.AWS_PROFILE?.mech).toEqual('AWS_SSO');
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

  given('[case4] keyrack.yml has invalid schema', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(
        join(agentDir, 'keyrack.yml'),
        `keys:
  XAI_API_KEY:
    mech: INVALID_MECH_TYPE
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

  given('[case5] keyrack.yml with empty keys', () => {
    beforeEach(() => {
      const agentDir = join(testDir, '.agent');
      mkdirSync(agentDir, { recursive: true });
      writeFileSync(join(agentDir, 'keyrack.yml'), 'keys: {}\n');
    });

    when('[t0] get called', () => {
      then('returns manifest with empty keys', async () => {
        const result = await daoKeyrackRepoManifest.get({ gitroot: testDir });

        expect(result).not.toBeNull();
        expect(Object.keys(result!.keys)).toHaveLength(0);
      });
    });
  });
});
