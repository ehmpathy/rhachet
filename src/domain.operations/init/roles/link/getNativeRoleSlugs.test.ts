import { given, then, when } from 'test-fns';

import { genTestTempDir } from '@src/.test/infra/genTestTempDir';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { mkdirSync } from 'node:fs';
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
      mkdirSync('.agent/repo=.this/role=homegrown', { recursive: true });
      mkdirSync('.agent/repo=.this/role=bespoke', { recursive: true });
      // a package-linked role under a non-native repo (must be excluded)
      mkdirSync('.agent/repo=ehmpathy/role=mechanic', { recursive: true });
    });

    afterAll(() => testDir.teardown());

    when('[t0] getNativeRoleSlugs is called', () => {
      then('returns only the repo=.this role slugs', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        const slugs = getNativeRoleSlugs({}, context);
        expect(slugs).toHaveLength(2);
        expect(slugs).toContain('homegrown');
        expect(slugs).toContain('bespoke');
      });

      then('excludes non-native repo roles', () => {
        const context = new ContextCli({
          cwd: testDir.path,
          gitroot: testDir.path,
        });
        const slugs = getNativeRoleSlugs({}, context);
        expect(slugs).not.toContain('mechanic');
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
      mkdirSync('.agent/repo=ehmpathy/role=mechanic', { recursive: true });
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
