import { given, then, when } from 'test-fns';

import { Role, RoleRegistry } from '@src/domain.objects';

import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { findNonExecutableShellSkills } from './findNonExecutableShellSkills';

describe('findNonExecutableShellSkills', () => {
  const testDir = resolve(__dirname, './.temp/findNonExecutableShellSkills');

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // clean skills directories before each test
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  /**
   * .what = creates a test role with a skills directory
   * .why = reduces boilerplate in test setup
   */
  const createTestRole = (input: { slug: string; skillsDir: string }): Role => {
    return new Role({
      slug: input.slug,
      name: input.slug,
      purpose: 'test role',
      readme: { uri: resolve(testDir, 'readme.md') },
      traits: [],
      briefs: { dirs: { uri: resolve(testDir, 'briefs') } },
      skills: {
        dirs: { uri: input.skillsDir },
        refs: [],
      },
    });
  };

  /**
   * .what = creates a test registry with roles
   * .why = reduces boilerplate in test setup
   */
  const createTestRegistry = (roles: Role[]): RoleRegistry => {
    return new RoleRegistry({
      slug: 'test-registry',
      readme: { uri: resolve(testDir, 'readme.md') },
      roles,
    });
  };

  given('[case1] registry with no roles', () => {
    when('find is invoked', () => {
      then('returns empty array', () => {
        const registry = createTestRegistry([]);
        const result = findNonExecutableShellSkills({ registry });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case2] role with empty skills.dirs (dir does not exist)', () => {
    when('find is invoked', () => {
      then('returns empty array', () => {
        const skillsDir = resolve(testDir, 'nonexistent-skills');
        const role = createTestRole({ slug: 'test', skillsDir });
        const registry = createTestRegistry([role]);

        const result = findNonExecutableShellSkills({ registry });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case3] skills dir with only .ts/.md files', () => {
    when('find is invoked', () => {
      then('returns empty array', () => {
        const skillsDir = resolve(testDir, 'skills-ts-md');
        mkdirSync(skillsDir, { recursive: true });
        writeFileSync(resolve(skillsDir, 'skill.ts'), 'export const x = 1;');
        writeFileSync(resolve(skillsDir, 'readme.md'), '# readme');

        const role = createTestRole({ slug: 'test', skillsDir });
        const registry = createTestRegistry([role]);

        const result = findNonExecutableShellSkills({ registry });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case4] skills dir with executable .sh files', () => {
    when('find is invoked', () => {
      then('returns empty array', () => {
        const skillsDir = resolve(testDir, 'skills-executable');
        mkdirSync(skillsDir, { recursive: true });

        const skill1 = resolve(skillsDir, 'skill1.sh');
        const skill2 = resolve(skillsDir, 'skill2.sh');
        writeFileSync(skill1, '#!/bin/bash\necho "skill1"');
        writeFileSync(skill2, '#!/bin/bash\necho "skill2"');
        chmodSync(skill1, 0o755);
        chmodSync(skill2, 0o755);

        const role = createTestRole({ slug: 'test', skillsDir });
        const registry = createTestRegistry([role]);

        const result = findNonExecutableShellSkills({ registry });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case5] skills dir with one non-executable .sh', () => {
    when('find is invoked', () => {
      then('returns array with that path', () => {
        const skillsDir = resolve(testDir, 'skills-non-exec');
        mkdirSync(skillsDir, { recursive: true });

        const skillPath = resolve(skillsDir, 'broken-skill.sh');
        writeFileSync(skillPath, '#!/bin/bash\necho "broken"');
        // intentionally NOT chmod to make it non-executable

        const role = createTestRole({ slug: 'test', skillsDir });
        const registry = createTestRegistry([role]);

        const result = findNonExecutableShellSkills({ registry });
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(skillPath);
      });
    });
  });

  given('[case6] mixed executable/non-executable .sh files', () => {
    when('find is invoked', () => {
      then('returns only non-executable paths', () => {
        const skillsDir = resolve(testDir, 'skills-mixed');
        mkdirSync(skillsDir, { recursive: true });

        const execSkill = resolve(skillsDir, 'good.sh');
        const nonExecSkill1 = resolve(skillsDir, 'broken1.sh');
        const nonExecSkill2 = resolve(skillsDir, 'broken2.sh');

        writeFileSync(execSkill, '#!/bin/bash\necho "good"');
        writeFileSync(nonExecSkill1, '#!/bin/bash\necho "broken1"');
        writeFileSync(nonExecSkill2, '#!/bin/bash\necho "broken2"');

        chmodSync(execSkill, 0o755);
        // intentionally NOT chmod broken skills

        const role = createTestRole({ slug: 'test', skillsDir });
        const registry = createTestRegistry([role]);

        const result = findNonExecutableShellSkills({ registry });
        expect(result).toHaveLength(2);
        expect(result).toContain(nonExecSkill1);
        expect(result).toContain(nonExecSkill2);
        expect(result).not.toContain(execSkill);
      });
    });
  });

  given('[case7] multiple roles, one with non-executable', () => {
    when('find is invoked', () => {
      then('returns path from the role with non-executable skill', () => {
        const skillsDir1 = resolve(testDir, 'skills-role1');
        const skillsDir2 = resolve(testDir, 'skills-role2');
        mkdirSync(skillsDir1, { recursive: true });
        mkdirSync(skillsDir2, { recursive: true });

        // role1 has executable skill
        const execSkill = resolve(skillsDir1, 'good.sh');
        writeFileSync(execSkill, '#!/bin/bash\necho "good"');
        chmodSync(execSkill, 0o755);

        // role2 has non-executable skill
        const nonExecSkill = resolve(skillsDir2, 'broken.sh');
        writeFileSync(nonExecSkill, '#!/bin/bash\necho "broken"');
        // intentionally NOT chmod

        const role1 = createTestRole({ slug: 'role1', skillsDir: skillsDir1 });
        const role2 = createTestRole({ slug: 'role2', skillsDir: skillsDir2 });
        const registry = createTestRegistry([role1, role2]);

        const result = findNonExecutableShellSkills({ registry });
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(nonExecSkill);
      });
    });
  });

  given('[case8] skills.dirs as single object', () => {
    when('find is invoked', () => {
      then('handles single object format correctly', () => {
        const skillsDir = resolve(testDir, 'skills-single');
        mkdirSync(skillsDir, { recursive: true });

        const nonExecSkill = resolve(skillsDir, 'broken.sh');
        writeFileSync(nonExecSkill, '#!/bin/bash\necho "broken"');
        // intentionally NOT chmod

        // explicitly use single object format
        const role = new Role({
          slug: 'test',
          name: 'test',
          purpose: 'test',
          readme: { uri: resolve(testDir, 'readme.md') },
          traits: [],
          briefs: { dirs: { uri: resolve(testDir, 'briefs') } },
          skills: {
            dirs: { uri: skillsDir }, // single object
            refs: [],
          },
        });
        const registry = createTestRegistry([role]);

        const result = findNonExecutableShellSkills({ registry });
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(nonExecSkill);
      });
    });
  });

  given('[case9] skills.dirs as array', () => {
    when('find is invoked', () => {
      then('handles array format correctly', () => {
        const skillsDir1 = resolve(testDir, 'skills-arr1');
        const skillsDir2 = resolve(testDir, 'skills-arr2');
        mkdirSync(skillsDir1, { recursive: true });
        mkdirSync(skillsDir2, { recursive: true });

        const nonExecSkill1 = resolve(skillsDir1, 'broken1.sh');
        const nonExecSkill2 = resolve(skillsDir2, 'broken2.sh');
        writeFileSync(nonExecSkill1, '#!/bin/bash\necho "broken1"');
        writeFileSync(nonExecSkill2, '#!/bin/bash\necho "broken2"');
        // intentionally NOT chmod

        // explicitly use array format
        const role = new Role({
          slug: 'test',
          name: 'test',
          purpose: 'test',
          readme: { uri: resolve(testDir, 'readme.md') },
          traits: [],
          briefs: { dirs: { uri: resolve(testDir, 'briefs') } },
          skills: {
            dirs: [{ uri: skillsDir1 }, { uri: skillsDir2 }], // array format
            refs: [],
          },
        });
        const registry = createTestRegistry([role]);

        const result = findNonExecutableShellSkills({ registry });
        expect(result).toHaveLength(2);
        expect(result).toContain(nonExecSkill1);
        expect(result).toContain(nonExecSkill2);
      });
    });
  });
});
