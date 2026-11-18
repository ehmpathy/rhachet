import { given, then, useThen, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getNativeRoleSlugs } from './getNativeRoleSlugs';

describe('getNativeRoleSlugs', () => {
  given('[case1] a repo with native roles under repo=.this', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getNativeRoleSlugs-with-native',
    });

    beforeAll(() => {
      testDir.setup();
      // native roles live under repo=.this
      mkdirSync(join(testDir.path, '.agent/repo=.this/role=homegrown'), {
        recursive: true,
      });
      mkdirSync(join(testDir.path, '.agent/repo=.this/role=bespoke'), {
        recursive: true,
      });
      // a package-linked role under a non-native repo (must be excluded)
      mkdirSync(join(testDir.path, '.agent/repo=ehmpathy/role=mechanic'), {
        recursive: true,
      });
    });

    afterAll(() => testDir.teardown());

    when('[t0] getNativeRoleSlugs is called', () => {
      // wrapped in an object: the shared-result proxy hands back a plain object, never an array
      const result = useThen('it succeeds', () => ({
        slugs: getNativeRoleSlugs(
          {},
          new ContextCli({ cwd: testDir.path, gitroot: testDir.path }),
        ),
      }));

      then('returns only the repo=.this role slugs', () => {
        expect(result.slugs).toHaveLength(2);
        expect(result.slugs).toContain('homegrown');
        expect(result.slugs).toContain('bespoke');
      });

      then('excludes non-native repo roles', () => {
        expect(result.slugs).not.toContain('mechanic');
      });
    });
  });

  given('[case2] a repo without .agent/', () => {
    when('[t0] getNativeRoleSlugs is called', () => {
      then('returns an empty array', () => {
        const context = new ContextCli({
          cwd: '/tmp/nonexistent-dir-native-98765',
          gitroot: '/tmp/nonexistent-dir-native-98765',
        });
        const slugs = getNativeRoleSlugs({}, context);
        expect(slugs).toEqual([]);
      });
    });
  });

  given('[case3] a repo with .agent/ but no repo=.this', () => {
    const testDir = genTestTempDir({
      base: __dirname,
      name: 'getNativeRoleSlugs-no-native',
    });

    beforeAll(() => {
      testDir.setup();
      // only a package-linked role, no native repo=.this
      mkdirSync(join(testDir.path, '.agent/repo=ehmpathy/role=mechanic'), {
        recursive: true,
      });
    });

    afterAll(() => testDir.teardown());

    when('[t0] getNativeRoleSlugs is called', () => {
      then('returns an empty array', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        const slugs = getNativeRoleSlugs({}, context);
        expect(slugs).toEqual([]);
      });
    });
  });
});
