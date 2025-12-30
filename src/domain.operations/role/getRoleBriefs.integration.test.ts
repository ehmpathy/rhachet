import { given, then, when } from 'test-fns';

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRoleBriefs } from './getRoleBriefs';

describe('getRoleBriefs', () => {
  const testDir = resolve(__dirname, './.temp/getRoleBriefs');
  const originalCwd = process.cwd();

  beforeAll(() => {
    // create test directory
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  beforeEach(() => {
    // clean up .agent directory before each test
    const agentDir = resolve(testDir, '.agent');
    if (existsSync(agentDir)) {
      rmSync(agentDir, { recursive: true, force: true });
    }
  });

  given('[case1] role linked with briefs', () => {
    beforeEach(() => {
      // create role with briefs
      const briefsDir = resolve(
        testDir,
        '.agent/repo=testorg/role=tester/briefs',
      );
      mkdirSync(briefsDir, { recursive: true });

      // create brief files
      writeFileSync(
        resolve(briefsDir, 'rule.require.tests.md'),
        '# always write tests',
      );
      writeFileSync(
        resolve(briefsDir, 'rule.prefer.coverage.md'),
        '# prefer high coverage',
      );
      writeFileSync(resolve(briefsDir, 'howto.debug.md'), '# how to debug');
    });

    when('[t0] getRoleBriefs with role name and brief names', () => {
      then('returns artifacts for matching briefs', async () => {
        const result = await getRoleBriefs({
          by: {
            role: { name: 'tester' },
            briefs: { name: ['rule.require.tests'] },
          },
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.ref.uri).toContain('rule.require.tests.md');
      });

      then('returns multiple artifacts for multiple names', async () => {
        const result = await getRoleBriefs({
          by: {
            role: { name: 'tester' },
            briefs: { name: ['rule.require.tests', 'rule.prefer.coverage'] },
          },
        });
        expect(result).toHaveLength(2);
      });
    });

    when('[t1] getRoleBriefs with glob pattern', () => {
      then('returns matching artifacts', async () => {
        const result = await getRoleBriefs({
          by: {
            role: { name: 'tester' },
            briefs: { glob: 'rule.*.md' },
          },
        });
        expect(result).toHaveLength(2);
        expect(result.every((a) => a.ref.uri.includes('rule.'))).toBe(true);
      });

      then('returns all briefs with wildcard glob', async () => {
        const result = await getRoleBriefs({
          by: {
            role: { name: 'tester' },
            briefs: { glob: '**/*.md' },
          },
        });
        expect(result).toHaveLength(3);
      });
    });

    when('[t2] getRoleBriefs with glob matching nothing', () => {
      then('returns empty array', async () => {
        const result = await getRoleBriefs({
          by: {
            role: { name: 'tester' },
            briefs: { glob: 'nonexistent-pattern-*.md' },
          },
        });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case2] multiple roles with same name across repos', () => {
    beforeEach(() => {
      // create same role name in two repos
      const briefsDir1 = resolve(
        testDir,
        '.agent/repo=org1/role=shared/briefs',
      );
      const briefsDir2 = resolve(
        testDir,
        '.agent/repo=org2/role=shared/briefs',
      );
      mkdirSync(briefsDir1, { recursive: true });
      mkdirSync(briefsDir2, { recursive: true });

      writeFileSync(resolve(briefsDir1, 'from-org1.md'), '# from org1');
      writeFileSync(resolve(briefsDir2, 'from-org2.md'), '# from org2');
    });

    when('[t0] getRoleBriefs without repo filter', () => {
      then('throws ambiguous error', async () => {
        await expect(
          getRoleBriefs({
            by: {
              role: { name: 'shared' },
              briefs: { glob: '*.md' },
            },
          }),
        ).rejects.toThrow('multiple roles found');
      });

      then('error message lists available repos', async () => {
        await expect(
          getRoleBriefs({
            by: {
              role: { name: 'shared' },
              briefs: { glob: '*.md' },
            },
          }),
        ).rejects.toThrow('repo=');
      });
    });

    when('[t1] getRoleBriefs with repo filter', () => {
      then('returns briefs from specified repo only', async () => {
        const result = await getRoleBriefs({
          by: {
            repo: { name: 'org1' },
            role: { name: 'shared' },
            briefs: { glob: '*.md' },
          },
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.ref.uri).toContain('from-org1.md');
      });
    });
  });

  given('[case3] role not found', () => {
    beforeEach(() => {
      // create .agent with a different role
      const briefsDir = resolve(
        testDir,
        '.agent/repo=testorg/role=existing/briefs',
      );
      mkdirSync(briefsDir, { recursive: true });
      writeFileSync(resolve(briefsDir, 'brief.md'), '# brief');
    });

    when('[t0] getRoleBriefs with nonexistent role', () => {
      then('throws with link hint', async () => {
        await expect(
          getRoleBriefs({
            by: {
              role: { name: 'nonexistent' },
              briefs: { glob: '*.md' },
            },
          }),
        ).rejects.toThrow('did you forget to `npx rhachet roles link');
      });

      then('error includes role name', async () => {
        await expect(
          getRoleBriefs({
            by: {
              role: { name: 'nonexistent' },
              briefs: { glob: '*.md' },
            },
          }),
        ).rejects.toThrow('nonexistent');
      });
    });
  });

  given('[case4] briefs directory missing', () => {
    beforeEach(() => {
      // create role WITHOUT briefs directory
      const roleDir = resolve(testDir, '.agent/repo=testorg/role=nobrief');
      mkdirSync(roleDir, { recursive: true });
      // intentionally NOT creating briefs/ subdirectory
    });

    when('[t0] getRoleBriefs', () => {
      then('throws with link hint', async () => {
        await expect(
          getRoleBriefs({
            by: {
              role: { name: 'nobrief' },
              briefs: { glob: '*.md' },
            },
          }),
        ).rejects.toThrow('briefs directory not found');
      });

      then('error suggests running roles link', async () => {
        await expect(
          getRoleBriefs({
            by: {
              role: { name: 'nobrief' },
              briefs: { glob: '*.md' },
            },
          }),
        ).rejects.toThrow('npx rhachet roles link');
      });
    });
  });

  given('[case5] brief name not found', () => {
    beforeEach(() => {
      // create role with some briefs
      const briefsDir = resolve(
        testDir,
        '.agent/repo=testorg/role=tester/briefs',
      );
      mkdirSync(briefsDir, { recursive: true });
      writeFileSync(resolve(briefsDir, 'existing.md'), '# existing');
    });

    when('[t0] getRoleBriefs with nonexistent brief name', () => {
      then('throws brief not found error', async () => {
        await expect(
          getRoleBriefs({
            by: {
              role: { name: 'tester' },
              briefs: { name: ['nonexistent-brief'] },
            },
          }),
        ).rejects.toThrow('brief "nonexistent-brief" not found');
      });
    });
  });

  given('[case6] no .agent directory', () => {
    when('[t0] getRoleBriefs', () => {
      then('throws with link hint', async () => {
        await expect(
          getRoleBriefs({
            by: {
              role: { name: 'any' },
              briefs: { glob: '*.md' },
            },
          }),
        ).rejects.toThrow('no .agent directory found');
      });
    });
  });

  given('[case7] briefs in nested subdirectories', () => {
    beforeEach(() => {
      // create role with nested brief structure
      const briefsDir = resolve(
        testDir,
        '.agent/repo=testorg/role=tester/briefs',
      );
      const nestedDir = resolve(briefsDir, 'practices/testing');
      mkdirSync(nestedDir, { recursive: true });

      writeFileSync(resolve(briefsDir, 'root.md'), '# root brief');
      writeFileSync(resolve(nestedDir, 'unit.md'), '# unit testing');
      writeFileSync(
        resolve(nestedDir, 'integration.md'),
        '# integration testing',
      );
    });

    when('[t0] getRoleBriefs with recursive glob', () => {
      then('finds briefs in nested directories', async () => {
        const result = await getRoleBriefs({
          by: {
            role: { name: 'tester' },
            briefs: { glob: '**/*.md' },
          },
        });
        expect(result).toHaveLength(3);
      });
    });

    when('[t1] getRoleBriefs with path-specific glob', () => {
      then('finds only briefs matching path pattern', async () => {
        const result = await getRoleBriefs({
          by: {
            role: { name: 'tester' },
            briefs: { glob: 'practices/**/*.md' },
          },
        });
        expect(result).toHaveLength(2);
        expect(result.every((a) => a.ref.uri.includes('practices'))).toBe(true);
      });
    });
  });
});
