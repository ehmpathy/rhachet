import { given, then, when } from 'test-fns';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverRoleKeyracks } from './discoverRoleKeyracks';

describe('discoverRoleKeyracks', () => {
  const testDir = join(__dirname, './.temp/discoverRoleKeyracks');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  given('[case1] no .agent directory', () => {
    when('[t0] discoverRoleKeyracks is called', () => {
      then('returns empty array', async () => {
        const result = await discoverRoleKeyracks(
          { roles: ['mechanic'] },
          { gitroot: testDir },
        );
        expect(result).toEqual([]);
      });
    });
  });

  given('[case2] .agent directory with no role keyracks', () => {
    when('[t0] discoverRoleKeyracks is called', () => {
      then('returns empty array', async () => {
        mkdirSync(join(testDir, '.agent'), { recursive: true });

        const result = await discoverRoleKeyracks(
          { roles: ['mechanic'] },
          { gitroot: testDir },
        );
        expect(result).toEqual([]);
      });
    });
  });

  given('[case3] .agent directory with one role keyrack', () => {
    when('[t0] discoverRoleKeyracks is called with that role', () => {
      then('returns array with one path', async () => {
        const keyrackPath = join(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        mkdirSync(join(testDir, '.agent/repo=ehmpathy/role=mechanic'), {
          recursive: true,
        });
        writeFileSync(keyrackPath, 'org: ehmpathy\n');

        const result = await discoverRoleKeyracks(
          { roles: ['mechanic'] },
          { gitroot: testDir },
        );
        expect(result).toEqual([
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        ]);
      });
    });

    when('[t1] discoverRoleKeyracks is called with different role', () => {
      then('returns empty array', async () => {
        const keyrackPath = join(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        mkdirSync(join(testDir, '.agent/repo=ehmpathy/role=mechanic'), {
          recursive: true,
        });
        writeFileSync(keyrackPath, 'org: ehmpathy\n');

        const result = await discoverRoleKeyracks(
          { roles: ['designer'] },
          { gitroot: testDir },
        );
        expect(result).toEqual([]);
      });
    });
  });

  given('[case4] .agent directory with multiple role keyracks', () => {
    when('[t0] discoverRoleKeyracks is called with all roles', () => {
      then('returns sorted array of paths', async () => {
        // create keyracks in non-alphabetical order
        const keyracks = [
          '.agent/repo=zebra/role=tester/keyrack.yml',
          '.agent/repo=alpha/role=worker/keyrack.yml',
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        ];

        for (const keyrack of keyracks) {
          const fullPath = join(testDir, keyrack);
          mkdirSync(join(fullPath, '..'), { recursive: true });
          writeFileSync(fullPath, 'org: test\n');
        }

        const result = await discoverRoleKeyracks(
          { roles: ['tester', 'worker', 'mechanic'] },
          { gitroot: testDir },
        );

        // should be sorted alphabetically
        expect(result).toEqual([
          '.agent/repo=alpha/role=worker/keyrack.yml',
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
          '.agent/repo=zebra/role=tester/keyrack.yml',
        ]);
      });
    });

    when('[t1] discoverRoleKeyracks is called with subset of roles', () => {
      then('returns only specified role keyracks', async () => {
        const keyracks = [
          '.agent/repo=zebra/role=tester/keyrack.yml',
          '.agent/repo=alpha/role=worker/keyrack.yml',
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        ];

        for (const keyrack of keyracks) {
          const fullPath = join(testDir, keyrack);
          mkdirSync(join(fullPath, '..'), { recursive: true });
          writeFileSync(fullPath, 'org: test\n');
        }

        const result = await discoverRoleKeyracks(
          { roles: ['mechanic', 'tester'] },
          { gitroot: testDir },
        );

        // should only include mechanic and tester, not worker
        expect(result).toEqual([
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
          '.agent/repo=zebra/role=tester/keyrack.yml',
        ]);
      });
    });
  });

  given('[case5] .agent directory with multiple roles in same repo', () => {
    when('[t0] discoverRoleKeyracks is called with both roles', () => {
      then('returns all specified role keyracks sorted', async () => {
        const keyracks = [
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
          '.agent/repo=ehmpathy/role=designer/keyrack.yml',
        ];

        for (const keyrack of keyracks) {
          const fullPath = join(testDir, keyrack);
          mkdirSync(join(fullPath, '..'), { recursive: true });
          writeFileSync(fullPath, 'org: ehmpathy\n');
        }

        const result = await discoverRoleKeyracks(
          { roles: ['mechanic', 'designer'] },
          { gitroot: testDir },
        );

        expect(result).toEqual([
          '.agent/repo=ehmpathy/role=designer/keyrack.yml',
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        ]);
      });
    });

    when('[t1] discoverRoleKeyracks is called with one role', () => {
      then('returns only that role keyrack', async () => {
        const keyracks = [
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
          '.agent/repo=ehmpathy/role=designer/keyrack.yml',
        ];

        for (const keyrack of keyracks) {
          const fullPath = join(testDir, keyrack);
          mkdirSync(join(fullPath, '..'), { recursive: true });
          writeFileSync(fullPath, 'org: ehmpathy\n');
        }

        const result = await discoverRoleKeyracks(
          { roles: ['mechanic'] },
          { gitroot: testDir },
        );

        expect(result).toEqual([
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        ]);
      });
    });
  });

  given('[case6] .agent directory with non-keyrack files', () => {
    when('[t0] discoverRoleKeyracks is called', () => {
      then('only returns keyrack.yml files for specified roles', async () => {
        // create keyrack and non-keyrack files
        const keyrackPath = join(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        const readmePath = join(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/readme.md',
        );
        const briefsDir = join(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/briefs',
        );

        mkdirSync(briefsDir, { recursive: true });
        writeFileSync(keyrackPath, 'org: ehmpathy\n');
        writeFileSync(readmePath, '# Mechanic\n');
        writeFileSync(join(briefsDir, 'rule.md'), '# Rule\n');

        const result = await discoverRoleKeyracks(
          { roles: ['mechanic'] },
          { gitroot: testDir },
        );

        expect(result).toEqual([
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        ]);
      });
    });
  });
});
