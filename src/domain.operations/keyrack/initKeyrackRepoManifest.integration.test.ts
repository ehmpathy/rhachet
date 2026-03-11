import { given, then, when } from 'test-fns';

import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import { initKeyrackRepoManifest } from '@src/domain.operations/keyrack/initKeyrackRepoManifest';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

describe('daoKeyrackRepoManifest.init', () => {
  const testDir = join(__dirname, './.temp/initKeyrackRepoManifest');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // clean test directory before each test
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  given('[case1] init at default path (.agent/keyrack.yml)', () => {
    when('[t0] init called without --at', () => {
      then('creates keyrack.yml at default path', async () => {
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
        });

        expect(result.effect).toEqual('created');
        expect(result.manifestPath).toContain('.agent/keyrack.yml');
        expect(existsSync(result.manifestPath)).toBe(true);
      });

      then('keyrack.yml contains org declaration', async () => {
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
        });

        const content = readFileSync(result.manifestPath, 'utf-8');
        expect(content).toContain('org: testorg');
      });
    });

    when('[t1] init called again at same path (idempotent)', () => {
      then('returns found effect', async () => {
        // first init
        await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
        });

        // second init
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'differentorg',
        });

        expect(result.effect).toEqual('found');
        expect(result.org).toEqual('testorg'); // original org preserved
      });
    });
  });

  given('[case2] init at custom path (--at)', () => {
    when('[t0] init called with --at relative path', () => {
      then('creates keyrack.yml at custom path', async () => {
        const customPath = 'src/roles/mechanic/keyrack.yml';
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
          at: customPath,
        });

        expect(result.effect).toEqual('created');
        expect(result.manifestPath).toEqual(join(testDir, customPath));
        expect(existsSync(result.manifestPath)).toBe(true);
      });

      then('does not create keyrack.yml at default path', async () => {
        const customPath = 'custom/keyrack.yml';
        await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
          at: customPath,
        });

        const defaultPath = join(testDir, '.agent', 'keyrack.yml');
        expect(existsSync(defaultPath)).toBe(false);
      });
    });

    when('[t1] init called with --at deeply nested path', () => {
      then('creates parent directories', async () => {
        const customPath = 'deep/nested/path/to/keyrack.yml';
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
          at: customPath,
        });

        expect(result.effect).toEqual('created');
        expect(existsSync(result.manifestPath)).toBe(true);
        expect(existsSync(join(testDir, 'deep/nested/path/to'))).toBe(true);
      });
    });

    when('[t2] init called with --at absolute path', () => {
      then('creates keyrack.yml at absolute path', async () => {
        const absolutePath = join(testDir, 'absolute/path/keyrack.yml');
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'testorg',
          at: absolutePath,
        });

        expect(result.effect).toEqual('created');
        expect(result.manifestPath).toEqual(absolutePath);
        expect(existsSync(absolutePath)).toBe(true);
      });
    });
  });

  given('[case3] init at custom path idempotent', () => {
    when('[t0] init called twice at same custom path', () => {
      then('returns found effect and preserves original org', async () => {
        const customPath = 'custom/keyrack.yml';

        // first init
        await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'originalorg',
          at: customPath,
        });

        // second init with different org
        const result = await daoKeyrackRepoManifest.init({
          gitroot: testDir,
          org: 'differentorg',
          at: customPath,
        });

        expect(result.effect).toEqual('found');
        expect(result.org).toEqual('originalorg'); // original preserved

        // verify file content unchanged
        const content = readFileSync(result.manifestPath, 'utf-8');
        expect(content).toContain('org: originalorg');
        expect(content).not.toContain('org: differentorg');
      });
    });
  });
});

describe('initKeyrackRepoManifest', () => {
  const testDir = join(__dirname, './.temp/initKeyrackRepoManifestOp');

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

  given('[case1] fresh repo with scoped package name', () => {
    when(
      '[t0] initKeyrackRepoManifest called with role that has keyrack',
      () => {
        then('auto-detects org from package.json scoped name', async () => {
          // create package.json with scoped name
          writeFileSync(
            join(testDir, 'package.json'),
            JSON.stringify({ name: '@myorg/my-project' }),
          );

          // create role keyrack (required for roles filter)
          const keyrackPath = join(
            testDir,
            '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
          );
          mkdirSync(join(keyrackPath, '..'), { recursive: true });
          writeFileSync(keyrackPath, 'org: ehmpathy\n');

          const result = await initKeyrackRepoManifest(
            { roles: ['mechanic'] },
            { gitroot: testDir },
          );

          expect(result.effect).toEqual('created');
          expect(result.org).toEqual('myorg');
          expect(existsSync(result.manifestPath)).toBe(true);
        });

        then('creates keyrack.yml with env sections', async () => {
          writeFileSync(
            join(testDir, 'package.json'),
            JSON.stringify({ name: '@myorg/my-project' }),
          );

          // create role keyrack
          const keyrackPath = join(
            testDir,
            '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
          );
          mkdirSync(join(keyrackPath, '..'), { recursive: true });
          writeFileSync(keyrackPath, 'org: ehmpathy\n');

          const result = await initKeyrackRepoManifest(
            { roles: ['mechanic'] },
            { gitroot: testDir },
          );
          const content = readFileSync(result.manifestPath, 'utf-8');

          expect(content).toContain('org: myorg');
          expect(content).toContain('env.prod:');
          expect(content).toContain('env.prep:');
          expect(content).toContain('env.test:');
        });
      },
    );
  });

  given('[case2] repo with role keyracks', () => {
    when('[t0] initKeyrackRepoManifest called with specified role', () => {
      then('populates extends with only specified role keyracks', async () => {
        // create package.json
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({ name: '@myorg/my-project' }),
        );

        // create multiple role keyracks
        const mechanic = join(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        mkdirSync(join(mechanic, '..'), { recursive: true });
        writeFileSync(mechanic, 'org: ehmpathy\n');

        const designer = join(
          testDir,
          '.agent/repo=ehmpathy/role=designer/keyrack.yml',
        );
        mkdirSync(join(designer, '..'), { recursive: true });
        writeFileSync(designer, 'org: ehmpathy\n');

        // only specify mechanic
        const result = await initKeyrackRepoManifest(
          { roles: ['mechanic'] },
          { gitroot: testDir },
        );
        const content = readFileSync(result.manifestPath, 'utf-8');

        // should only include mechanic, not designer
        expect(result.extends).toEqual([
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        ]);
        expect(content).toContain('extends:');
        expect(content).toContain(
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        expect(content).not.toContain('designer');
      });
    });

    when('[t1] initKeyrackRepoManifest called with multiple roles', () => {
      then('populates extends with all specified role keyracks', async () => {
        // create package.json
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({ name: '@myorg/my-project' }),
        );

        // create multiple role keyracks
        const mechanic = join(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        mkdirSync(join(mechanic, '..'), { recursive: true });
        writeFileSync(mechanic, 'org: ehmpathy\n');

        const designer = join(
          testDir,
          '.agent/repo=ehmpathy/role=designer/keyrack.yml',
        );
        mkdirSync(join(designer, '..'), { recursive: true });
        writeFileSync(designer, 'org: ehmpathy\n');

        // specify both
        const result = await initKeyrackRepoManifest(
          { roles: ['mechanic', 'designer'] },
          { gitroot: testDir },
        );

        expect(result.extends).toEqual([
          '.agent/repo=ehmpathy/role=designer/keyrack.yml',
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        ]);
      });
    });
  });

  given('[case3] repo without detectable org', () => {
    when('[t0] initKeyrackRepoManifest called', () => {
      then('throws BadRequestError', async () => {
        // create package.json without org info
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({ name: 'unscoped-package', version: '1.0.0' }),
        );

        // create role keyrack
        const keyrackPath = join(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        mkdirSync(join(keyrackPath, '..'), { recursive: true });
        writeFileSync(keyrackPath, 'org: ehmpathy\n');

        await expect(
          initKeyrackRepoManifest(
            { roles: ['mechanic'] },
            { gitroot: testDir },
          ),
        ).rejects.toThrow('unable to detect org from package.json');
      });
    });
  });

  given('[case4] manifest present, new role keyrack added', () => {
    when('[t0] initKeyrackRepoManifest called with new role', () => {
      then('returns updated effect and merges extends', async () => {
        // create package.json
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({ name: '@myorg/my-project' }),
        );

        // create initial manifest with one extend
        const manifestPath = join(testDir, '.agent', 'keyrack.yml');
        mkdirSync(join(manifestPath, '..'), { recursive: true });
        writeFileSync(
          manifestPath,
          'org: myorg\nextends:\n  - .agent/repo=alpha/role=first/keyrack.yml\nenv.prod:\nenv.test:\n',
        );

        // create new role keyrack
        const keyrackPath = join(
          testDir,
          '.agent/repo=beta/role=second/keyrack.yml',
        );
        mkdirSync(join(keyrackPath, '..'), { recursive: true });
        writeFileSync(keyrackPath, 'org: beta\n');

        const result = await initKeyrackRepoManifest(
          { roles: ['second'] },
          { gitroot: testDir },
        );

        expect(result.effect).toEqual('updated');
        expect(result.extends).toContain(
          '.agent/repo=alpha/role=first/keyrack.yml',
        );
        expect(result.extends).toContain(
          '.agent/repo=beta/role=second/keyrack.yml',
        );
        // verify sorted
        expect(result.extends[0]).toEqual(
          '.agent/repo=alpha/role=first/keyrack.yml',
        );
      });
    });
  });

  given('[case5] manifest present and up-to-date', () => {
    when('[t0] initKeyrackRepoManifest called with same role', () => {
      then('returns found effect', async () => {
        // create package.json
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({ name: '@myorg/my-project' }),
        );

        // create role keyrack
        const keyrackPath = join(
          testDir,
          '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
        );
        mkdirSync(join(keyrackPath, '..'), { recursive: true });
        writeFileSync(keyrackPath, 'org: ehmpathy\n');

        // create manifest that already has the extends
        const manifestPath = join(testDir, '.agent', 'keyrack.yml');
        writeFileSync(
          manifestPath,
          'org: myorg\nextends:\n  - .agent/repo=ehmpathy/role=mechanic/keyrack.yml\nenv.prod:\nenv.test:\n',
        );

        const result = await initKeyrackRepoManifest(
          { roles: ['mechanic'] },
          { gitroot: testDir },
        );

        expect(result.effect).toEqual('found');
      });
    });
  });

  given('[case6] manifest preserves manual extends entries', () => {
    when('[t0] initKeyrackRepoManifest called with new role', () => {
      then('preserves manual extends (append-only semantics)', async () => {
        // create package.json
        writeFileSync(
          join(testDir, 'package.json'),
          JSON.stringify({ name: '@myorg/my-project' }),
        );

        // create manifest with manual extends (no file for this path)
        const manifestPath = join(testDir, '.agent', 'keyrack.yml');
        mkdirSync(join(manifestPath, '..'), { recursive: true });
        writeFileSync(
          manifestPath,
          'org: myorg\nextends:\n  - .agent/repo=manual/role=entry/keyrack.yml\nenv.prod:\nenv.test:\n',
        );

        // create a new role keyrack
        const keyrackPath = join(
          testDir,
          '.agent/repo=new/role=added/keyrack.yml',
        );
        mkdirSync(join(keyrackPath, '..'), { recursive: true });
        writeFileSync(keyrackPath, 'org: new\n');

        const result = await initKeyrackRepoManifest(
          { roles: ['added'] },
          { gitroot: testDir },
        );

        expect(result.effect).toEqual('updated');
        // both manual and new should be present
        expect(result.extends).toContain(
          '.agent/repo=manual/role=entry/keyrack.yml',
        );
        expect(result.extends).toContain(
          '.agent/repo=new/role=added/keyrack.yml',
        );
      });
    });
  });

  given('[case7] specified role lacks keyrack (skip behavior)', () => {
    when(
      '[t0] initKeyrackRepoManifest called with role that has no keyrack',
      () => {
        then('creates manifest with empty extends', async () => {
          // create package.json
          writeFileSync(
            join(testDir, 'package.json'),
            JSON.stringify({ name: '@myorg/my-project' }),
          );

          // create role WITHOUT keyrack (just readme)
          const roleDir = join(testDir, '.agent/repo=ehmpathy/role=norack');
          mkdirSync(roleDir, { recursive: true });
          writeFileSync(join(roleDir, 'readme.md'), '# No keyrack\n');

          const result = await initKeyrackRepoManifest(
            { roles: ['norack'] },
            { gitroot: testDir },
          );

          expect(result.effect).toEqual('created');
          expect(result.extends).toEqual([]); // empty, role skipped
          expect(result.org).toEqual('myorg');

          const content = readFileSync(result.manifestPath, 'utf-8');
          expect(content).toContain('org: myorg');
          expect(content).not.toContain('extends:'); // no extends section
        });
      },
    );

    when(
      '[t1] initKeyrackRepoManifest called with mix of valid and invalid roles',
      () => {
        then('skips roles without keyracks, includes roles with', async () => {
          // create package.json
          writeFileSync(
            join(testDir, 'package.json'),
            JSON.stringify({ name: '@myorg/my-project' }),
          );

          // create one role WITH keyrack
          const keyrackPath = join(
            testDir,
            '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
          );
          mkdirSync(join(keyrackPath, '..'), { recursive: true });
          writeFileSync(keyrackPath, 'org: ehmpathy\n');

          // create another role WITHOUT keyrack
          const roleDir = join(testDir, '.agent/repo=ehmpathy/role=norack');
          mkdirSync(roleDir, { recursive: true });
          writeFileSync(join(roleDir, 'readme.md'), '# No keyrack\n');

          const result = await initKeyrackRepoManifest(
            { roles: ['mechanic', 'norack'] },
            { gitroot: testDir },
          );

          expect(result.effect).toEqual('created');
          // only mechanic should be in extends, norack skipped
          expect(result.extends).toEqual([
            '.agent/repo=ehmpathy/role=mechanic/keyrack.yml',
          ]);
        });
      },
    );
  });
});
