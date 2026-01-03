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
import { discoverSkillExecutables } from './discoverSkillExecutables';

describe('discoverSkillExecutables', () => {
  const testDir = resolve(__dirname, './.temp/discoverSkillExecutables');
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
    when('discovering skills', () => {
      then('returns empty array', () => {
        const result = discoverSkillExecutables({});
        expect(result).toEqual([]);
      });
    });
  });

  given('empty .agent directory', () => {
    beforeEach(() => {
      mkdirSync(resolve(testDir, '.agent'), { recursive: true });
    });

    when('discovering skills', () => {
      then('returns empty array', () => {
        const result = discoverSkillExecutables({});
        expect(result).toEqual([]);
      });
    });
  });

  given('skills in one repo and role', () => {
    beforeEach(() => {
      const skillsDir = resolve(testDir, '.agent/repo=.this/role=any/skills');
      mkdirSync(skillsDir, { recursive: true });

      // create skill files
      writeFileSync(
        resolve(skillsDir, 'init.sh'),
        '#!/usr/bin/env bash\necho init',
      );
      writeFileSync(
        resolve(skillsDir, 'build'),
        '#!/usr/bin/env bash\necho build',
      );
      chmodSync(resolve(skillsDir, 'init.sh'), '755');
      chmodSync(resolve(skillsDir, 'build'), '755');
    });

    when('discovering all skills', () => {
      then('finds both skills', () => {
        const result = discoverSkillExecutables({});
        expect(result).toHaveLength(2);
      });

      then('extracts slug from .sh file', () => {
        const result = discoverSkillExecutables({});
        const initSkill = result.find((s) => s.slug === 'init');
        expect(initSkill).toBeDefined();
        expect(initSkill?.slugRepo).toBe('.this');
        expect(initSkill?.slugRole).toBe('any');
      });

      then('extracts slug from extensionless file', () => {
        const result = discoverSkillExecutables({});
        const buildSkill = result.find((s) => s.slug === 'build');
        expect(buildSkill).toBeDefined();
      });
    });

    when('filtering by slugSkill', () => {
      then('returns only matching skill', () => {
        const result = discoverSkillExecutables({ slugSkill: 'init' });
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('init');
      });

      then('returns empty for non-matching slug', () => {
        const result = discoverSkillExecutables({ slugSkill: 'nonexistent' });
        expect(result).toEqual([]);
      });
    });
  });

  given('skills in multiple repos', () => {
    beforeEach(() => {
      // repo=.this
      const skillsDir1 = resolve(testDir, '.agent/repo=.this/role=any/skills');
      mkdirSync(skillsDir1, { recursive: true });
      writeFileSync(resolve(skillsDir1, 'local.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(skillsDir1, 'local.sh'), '755');

      // repo=ehmpathy
      const skillsDir2 = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/skills',
      );
      mkdirSync(skillsDir2, { recursive: true });
      writeFileSync(resolve(skillsDir2, 'remote.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(skillsDir2, 'remote.sh'), '755');
    });

    when('discovering all skills', () => {
      then('finds skills from both repos', () => {
        const result = discoverSkillExecutables({});
        expect(result).toHaveLength(2);
        expect(result.map((s) => s.slugRepo).sort()).toEqual([
          '.this',
          'ehmpathy',
        ]);
      });
    });

    when('filtering by slugRepo', () => {
      then('returns only skills from that repo', () => {
        const result = discoverSkillExecutables({ slugRepo: '.this' });
        expect(result).toHaveLength(1);
        expect(result[0]?.slugRepo).toBe('.this');
        expect(result[0]?.slug).toBe('local');
      });
    });
  });

  given('skills in multiple roles within same repo', () => {
    beforeEach(() => {
      // role=mechanic
      const skillsDir1 = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/skills',
      );
      mkdirSync(skillsDir1, { recursive: true });
      writeFileSync(resolve(skillsDir1, 'build.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(skillsDir1, 'build.sh'), '755');

      // role=designer
      const skillsDir2 = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=designer/skills',
      );
      mkdirSync(skillsDir2, { recursive: true });
      writeFileSync(resolve(skillsDir2, 'design.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(skillsDir2, 'design.sh'), '755');
    });

    when('discovering all skills', () => {
      then('finds skills from both roles', () => {
        const result = discoverSkillExecutables({});
        expect(result).toHaveLength(2);
        expect(result.map((s) => s.slugRole).sort()).toEqual([
          'designer',
          'mechanic',
        ]);
      });
    });

    when('filtering by slugRole', () => {
      then('returns only skills from that role', () => {
        const result = discoverSkillExecutables({ slugRole: 'mechanic' });
        expect(result).toHaveLength(1);
        expect(result[0]?.slugRole).toBe('mechanic');
        expect(result[0]?.slug).toBe('build');
      });
    });
  });

  given('skills in nested subdirectories', () => {
    beforeEach(() => {
      // nested skill in claude.hooks/
      const nestedDir = resolve(
        testDir,
        '.agent/repo=.this/role=any/skills/claude.hooks',
      );
      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(resolve(nestedDir, 'pretooluse.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(nestedDir, 'pretooluse.sh'), '755');

      // top-level skill
      const skillsDir = resolve(testDir, '.agent/repo=.this/role=any/skills');
      writeFileSync(resolve(skillsDir, 'init.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(skillsDir, 'init.sh'), '755');
    });

    when('discovering skills', () => {
      then('finds both top-level and nested skills', () => {
        const result = discoverSkillExecutables({});
        expect(result).toHaveLength(2);
      });

      then('nested skill has correct slug', () => {
        const result = discoverSkillExecutables({});
        const nestedSkill = result.find((s) => s.slug === 'pretooluse');
        expect(nestedSkill).toBeDefined();
        expect(nestedSkill?.path).toContain('claude.hooks');
      });
    });

    when('filtering by nested skill slug', () => {
      then('finds the nested skill', () => {
        const result = discoverSkillExecutables({ slugSkill: 'pretooluse' });
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('pretooluse');
      });
    });
  });

  given('skill only in external repo (not .this)', () => {
    beforeEach(() => {
      const skillsDir = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/skills',
      );
      mkdirSync(skillsDir, { recursive: true });
      writeFileSync(
        resolve(skillsDir, 'deploy.sh'),
        '#!/usr/bin/env bash\necho deploy',
      );
      chmodSync(resolve(skillsDir, 'deploy.sh'), '755');
    });

    when('discovering all skills', () => {
      then('finds skill from external repo', () => {
        const result = discoverSkillExecutables({});
        expect(result).toHaveLength(1);
        expect(result[0]?.slugRepo).toBe('ehmpathy');
        expect(result[0]?.slugRole).toBe('mechanic');
        expect(result[0]?.slug).toBe('deploy');
      });
    });

    when('filtering by external slugRepo', () => {
      then('returns the skill', () => {
        const result = discoverSkillExecutables({ slugRepo: 'ehmpathy' });
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('deploy');
      });
    });

    when('filtering by wrong slugRepo', () => {
      then('returns empty', () => {
        const result = discoverSkillExecutables({ slugRepo: '.this' });
        expect(result).toEqual([]);
      });
    });
  });

  given('skills directory is a symlink (external repo pattern)', () => {
    beforeEach(() => {
      // clean up source package dir
      const sourceRoot = resolve(testDir, '.source-package');
      if (existsSync(sourceRoot)) {
        rmSync(sourceRoot, { recursive: true, force: true });
      }

      // create actual skills in a "source" location (simulating npm package)
      const sourceDir = resolve(testDir, '.source-package/skills');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(
        resolve(sourceDir, 'init.claude.sh'),
        '#!/usr/bin/env bash\necho init',
      );
      chmodSync(resolve(sourceDir, 'init.claude.sh'), '755');

      // create .agent structure with symlinked skills dir
      const roleDir = resolve(testDir, '.agent/repo=ehmpathy/role=mechanic');
      mkdirSync(roleDir, { recursive: true });

      // symlink skills -> source package
      symlinkSync(sourceDir, resolve(roleDir, 'skills'));
    });

    when('discovering skills', () => {
      then('traverses symlink and finds skills', () => {
        const result = discoverSkillExecutables({});
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('init.claude');
        expect(result[0]?.slugRepo).toBe('ehmpathy');
      });
    });

    when('filtering by slugRepo', () => {
      then('finds skill through symlink', () => {
        const result = discoverSkillExecutables({ slugRepo: 'ehmpathy' });
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('init.claude');
      });
    });
  });

  given('skill file itself is a symlink', () => {
    beforeEach(() => {
      // clean up source package dir
      const sourceRoot = resolve(testDir, '.source-package');
      if (existsSync(sourceRoot)) {
        rmSync(sourceRoot, { recursive: true, force: true });
      }

      // create actual skill file
      const sourceDir = resolve(testDir, '.source-package');
      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(
        resolve(sourceDir, 'real-skill.sh'),
        '#!/usr/bin/env bash\necho real',
      );
      chmodSync(resolve(sourceDir, 'real-skill.sh'), '755');

      // create skills dir with symlinked skill file
      const skillsDir = resolve(testDir, '.agent/repo=.this/role=any/skills');
      mkdirSync(skillsDir, { recursive: true });
      symlinkSync(
        resolve(sourceDir, 'real-skill.sh'),
        resolve(skillsDir, 'linked-skill.sh'),
      );
    });

    when('discovering skills', () => {
      then('finds the symlinked skill file', () => {
        const result = discoverSkillExecutables({});
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('linked-skill');
      });
    });
  });

  given('combined filters', () => {
    beforeEach(() => {
      // same skill name in different repos/roles
      const dirs = [
        '.agent/repo=.this/role=any/skills',
        '.agent/repo=.this/role=mechanic/skills',
        '.agent/repo=ehmpathy/role=mechanic/skills',
      ];

      for (const dir of dirs) {
        mkdirSync(resolve(testDir, dir), { recursive: true });
        writeFileSync(resolve(testDir, dir, 'init.sh'), '#!/usr/bin/env bash');
        chmodSync(resolve(testDir, dir, 'init.sh'), '755');
      }
    });

    when('filtering by slugRepo and slugRole', () => {
      then('returns only matching skill', () => {
        const result = discoverSkillExecutables({
          slugRepo: '.this',
          slugRole: 'mechanic',
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.slugRepo).toBe('.this');
        expect(result[0]?.slugRole).toBe('mechanic');
      });
    });

    when('filtering by all three: slugRepo, slugRole, slugSkill', () => {
      then('returns exact match', () => {
        const result = discoverSkillExecutables({
          slugRepo: 'ehmpathy',
          slugRole: 'mechanic',
          slugSkill: 'init',
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.slugRepo).toBe('ehmpathy');
        expect(result[0]?.slugRole).toBe('mechanic');
        expect(result[0]?.slug).toBe('init');
      });
    });
  });
});
