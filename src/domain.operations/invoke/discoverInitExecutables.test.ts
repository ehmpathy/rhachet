import { given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { discoverInitExecutables } from './discoverInitExecutables';

describe('discoverInitExecutables', () => {
  const testDir = resolve(__dirname, './.temp/discoverInitExecutables');
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

  given('no .agent directory exists', () => {
    when('discovering inits', () => {
      then('returns empty array', () => {
        const result = discoverInitExecutables({});
        expect(result).toEqual([]);
      });
    });
  });

  given('empty .agent directory', () => {
    beforeEach(() => {
      mkdirSync(resolve(testDir, '.agent'), { recursive: true });
    });

    when('discovering inits', () => {
      then('returns empty array', () => {
        const result = discoverInitExecutables({});
        expect(result).toEqual([]);
      });
    });
  });

  given('inits in one repo and role', () => {
    beforeEach(() => {
      const initsDir = resolve(testDir, '.agent/repo=.this/role=any/inits');
      mkdirSync(initsDir, { recursive: true });

      // create init files
      writeFileSync(
        resolve(initsDir, 'init.claude.sh'),
        '#!/usr/bin/env bash\necho init',
      );
      writeFileSync(
        resolve(initsDir, 'setup'),
        '#!/usr/bin/env bash\necho setup',
      );
      chmodSync(resolve(initsDir, 'init.claude.sh'), '755');
      chmodSync(resolve(initsDir, 'setup'), '755');
    });

    when('discovering all inits', () => {
      then('finds both inits', () => {
        const result = discoverInitExecutables({});
        expect(result).toHaveLength(2);
      });

      then('extracts slug from .sh file', () => {
        const result = discoverInitExecutables({});
        const initScript = result.find((s) => s.slug === 'init.claude');
        expect(initScript).toBeDefined();
        expect(initScript?.repoSlug).toBe('.this');
        expect(initScript?.roleSlug).toBe('any');
      });

      then('extracts slug from extensionless file', () => {
        const result = discoverInitExecutables({});
        const setupInit = result.find((s) => s.slug === 'setup');
        expect(setupInit).toBeDefined();
      });
    });

    when('filtering by initSlug', () => {
      then('returns only matching init', () => {
        const result = discoverInitExecutables({ initSlug: 'init.claude' });
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('init.claude');
      });

      then('returns empty for non-matching slug', () => {
        const result = discoverInitExecutables({ initSlug: 'nonexistent' });
        expect(result).toEqual([]);
      });
    });
  });

  given('inits in multiple repos', () => {
    beforeEach(() => {
      // repo=.this
      const initsDir1 = resolve(testDir, '.agent/repo=.this/role=any/inits');
      mkdirSync(initsDir1, { recursive: true });
      writeFileSync(resolve(initsDir1, 'local.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(initsDir1, 'local.sh'), '755');

      // repo=ehmpathy
      const initsDir2 = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/inits',
      );
      mkdirSync(initsDir2, { recursive: true });
      writeFileSync(resolve(initsDir2, 'remote.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(initsDir2, 'remote.sh'), '755');
    });

    when('discovering all inits', () => {
      then('finds inits from both repos', () => {
        const result = discoverInitExecutables({});
        expect(result).toHaveLength(2);
        expect(result.map((s) => s.repoSlug).sort()).toEqual([
          '.this',
          'ehmpathy',
        ]);
      });
    });

    when('filtering by repoSlug', () => {
      then('returns only inits from that repo', () => {
        const result = discoverInitExecutables({ repoSlug: '.this' });
        expect(result).toHaveLength(1);
        expect(result[0]?.repoSlug).toBe('.this');
        expect(result[0]?.slug).toBe('local');
      });
    });
  });

  given('inits in multiple roles within same repo', () => {
    beforeEach(() => {
      // role=mechanic
      const initsDir1 = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/inits',
      );
      mkdirSync(initsDir1, { recursive: true });
      writeFileSync(
        resolve(initsDir1, 'init.claude.sh'),
        '#!/usr/bin/env bash',
      );
      chmodSync(resolve(initsDir1, 'init.claude.sh'), '755');

      // role=designer
      const initsDir2 = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=designer/inits',
      );
      mkdirSync(initsDir2, { recursive: true });
      writeFileSync(resolve(initsDir2, 'init.figma.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(initsDir2, 'init.figma.sh'), '755');
    });

    when('discovering all inits', () => {
      then('finds inits from both roles', () => {
        const result = discoverInitExecutables({});
        expect(result).toHaveLength(2);
        expect(result.map((s) => s.roleSlug).sort()).toEqual([
          'designer',
          'mechanic',
        ]);
      });
    });

    when('filtering by roleSlug', () => {
      then('returns only inits from that role', () => {
        const result = discoverInitExecutables({ roleSlug: 'mechanic' });
        expect(result).toHaveLength(1);
        expect(result[0]?.roleSlug).toBe('mechanic');
        expect(result[0]?.slug).toBe('init.claude');
      });
    });
  });

  given('inits in nested subdirectories (key difference from skills)', () => {
    beforeEach(() => {
      // nested init in claude.hooks/
      const nestedDir = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks',
      );
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(
        resolve(nestedDir, 'sessionstart.notify-permissions.sh'),
        '#!/usr/bin/env bash',
      );
      chmodSync(
        resolve(nestedDir, 'sessionstart.notify-permissions.sh'),
        '755',
      );

      // top-level init
      const initsDir = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/inits',
      );
      writeFileSync(resolve(initsDir, 'init.claude.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(initsDir, 'init.claude.sh'), '755');
    });

    when('discovering inits', () => {
      then('finds both top-level and nested inits', () => {
        const result = discoverInitExecutables({});
        expect(result).toHaveLength(2);
      });

      then('nested init has full relative path as slug', () => {
        const result = discoverInitExecutables({});
        const nestedInit = result.find(
          (s) => s.slug === 'claude.hooks/sessionstart.notify-permissions',
        );
        expect(nestedInit).toBeDefined();
        expect(nestedInit?.path).toContain('claude.hooks');
      });

      then('top-level init has simple slug', () => {
        const result = discoverInitExecutables({});
        const topLevelInit = result.find((s) => s.slug === 'init.claude');
        expect(topLevelInit).toBeDefined();
      });
    });

    when('filtering by nested init slug with full path', () => {
      then('finds the nested init', () => {
        const result = discoverInitExecutables({
          initSlug: 'claude.hooks/sessionstart.notify-permissions',
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe(
          'claude.hooks/sessionstart.notify-permissions',
        );
      });
    });

    when('filtering by partial nested path (should not match)', () => {
      then('returns empty because slug must match exactly', () => {
        const result = discoverInitExecutables({
          initSlug: 'sessionstart.notify-permissions',
        });
        expect(result).toEqual([]);
      });
    });
  });

  given('init only in external repo (not .this)', () => {
    beforeEach(() => {
      const initsDir = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/inits',
      );
      mkdirSync(initsDir, { recursive: true });
      writeFileSync(
        resolve(initsDir, 'init.claude.sh'),
        '#!/usr/bin/env bash\necho init',
      );
      chmodSync(resolve(initsDir, 'init.claude.sh'), '755');
    });

    when('discovering all inits', () => {
      then('finds init from external repo', () => {
        const result = discoverInitExecutables({});
        expect(result).toHaveLength(1);
        expect(result[0]?.repoSlug).toBe('ehmpathy');
        expect(result[0]?.roleSlug).toBe('mechanic');
        expect(result[0]?.slug).toBe('init.claude');
      });
    });

    when('filtering by external repoSlug', () => {
      then('returns the init', () => {
        const result = discoverInitExecutables({ repoSlug: 'ehmpathy' });
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('init.claude');
      });
    });

    when('filtering by wrong repoSlug', () => {
      then('returns empty', () => {
        const result = discoverInitExecutables({ repoSlug: '.this' });
        expect(result).toEqual([]);
      });
    });
  });

  given('inits directory is a symlink (external repo pattern)', () => {
    beforeEach(() => {
      // clean up source package dir
      const sourceRoot = resolve(testDir, '.source-package');
      if (existsSync(sourceRoot)) {
        rmSync(sourceRoot, { recursive: true, force: true });
      }

      // create actual inits in a "source" location (simulating npm package)
      const sourceDir = resolve(testDir, '.source-package/inits');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(
        resolve(sourceDir, 'init.claude.sh'),
        '#!/usr/bin/env bash\necho init',
      );
      chmodSync(resolve(sourceDir, 'init.claude.sh'), '755');

      // create .agent structure with symlinked inits dir
      const roleDir = resolve(testDir, '.agent/repo=ehmpathy/role=mechanic');
      mkdirSync(roleDir, { recursive: true });

      // symlink inits -> source package
      symlinkSync(sourceDir, resolve(roleDir, 'inits'));
    });

    when('discovering inits', () => {
      then('traverses symlink and finds inits', () => {
        const result = discoverInitExecutables({});
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('init.claude');
        expect(result[0]?.repoSlug).toBe('ehmpathy');
      });
    });

    when('filtering by repoSlug', () => {
      then('finds init through symlink', () => {
        const result = discoverInitExecutables({ repoSlug: 'ehmpathy' });
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('init.claude');
      });
    });
  });

  given('combined filters', () => {
    beforeEach(() => {
      // same init name in different repos/roles
      const dirs = [
        '.agent/repo=.this/role=any/inits',
        '.agent/repo=.this/role=mechanic/inits',
        '.agent/repo=ehmpathy/role=mechanic/inits',
      ];

      for (const dir of dirs) {
        mkdirSync(resolve(testDir, dir), { recursive: true });
        writeFileSync(
          resolve(testDir, dir, 'init.claude.sh'),
          '#!/usr/bin/env bash',
        );
        chmodSync(resolve(testDir, dir, 'init.claude.sh'), '755');
      }
    });

    when('filtering by repoSlug and roleSlug', () => {
      then('returns only matching init', () => {
        const result = discoverInitExecutables({
          repoSlug: '.this',
          roleSlug: 'mechanic',
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.repoSlug).toBe('.this');
        expect(result[0]?.roleSlug).toBe('mechanic');
      });
    });

    when('filtering by all three: repoSlug, roleSlug, initSlug', () => {
      then('returns exact match', () => {
        const result = discoverInitExecutables({
          repoSlug: 'ehmpathy',
          roleSlug: 'mechanic',
          initSlug: 'init.claude',
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.repoSlug).toBe('ehmpathy');
        expect(result[0]?.roleSlug).toBe('mechanic');
        expect(result[0]?.slug).toBe('init.claude');
      });
    });
  });
});
