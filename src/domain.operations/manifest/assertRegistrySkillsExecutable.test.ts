import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { Role, RoleRegistry } from '@src/domain.objects';

import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertRegistrySkillsExecutable } from './assertRegistrySkillsExecutable';

describe('assertRegistrySkillsExecutable', () => {
  const testDir = resolve(__dirname, './.temp/assertRegistrySkillsExecutable');

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

  given('[case1] registry with all executable skills', () => {
    when('assert is invoked', () => {
      then('does not throw error', () => {
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

        expect(() =>
          assertRegistrySkillsExecutable({ registry }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] registry with one non-executable skill', () => {
    when('assert is invoked', () => {
      then('throws BadRequestError', async () => {
        const skillsDir = resolve(testDir, 'skills-one-broken');
        mkdirSync(skillsDir, { recursive: true });

        const brokenSkill = resolve(skillsDir, 'broken.sh');
        writeFileSync(brokenSkill, '#!/bin/bash\necho "broken"');
        // intentionally NOT chmod

        const role = createTestRole({ slug: 'test', skillsDir });
        const registry = createTestRegistry([role]);

        const error = await getError(() =>
          assertRegistrySkillsExecutable({ registry }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
      });

      then('error message contains path', async () => {
        const skillsDir = resolve(testDir, 'skills-one-broken-msg');
        mkdirSync(skillsDir, { recursive: true });

        const brokenSkill = resolve(skillsDir, 'broken.sh');
        writeFileSync(brokenSkill, '#!/bin/bash\necho "broken"');
        // intentionally NOT chmod

        const role = createTestRole({ slug: 'test', skillsDir });
        const registry = createTestRegistry([role]);

        const error = await getError(() =>
          assertRegistrySkillsExecutable({ registry }),
        );

        expect(error?.message).toContain(brokenSkill);
      });

      then('error message includes fix hint', async () => {
        const skillsDir = resolve(testDir, 'skills-one-broken-hint');
        mkdirSync(skillsDir, { recursive: true });

        const brokenSkill = resolve(skillsDir, 'broken.sh');
        writeFileSync(brokenSkill, '#!/bin/bash\necho "broken"');
        // intentionally NOT chmod

        const role = createTestRole({ slug: 'test', skillsDir });
        const registry = createTestRegistry([role]);

        const error = await getError(() =>
          assertRegistrySkillsExecutable({ registry }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error?.message).toContain('chmod +x');
      });
    });
  });

  given('[case3] registry with multiple non-executable skills', () => {
    when('assert is invoked', () => {
      then('error message lists ALL paths', async () => {
        const skillsDir = resolve(testDir, 'skills-multi-broken');
        mkdirSync(skillsDir, { recursive: true });

        const broken1 = resolve(skillsDir, 'broken1.sh');
        const broken2 = resolve(skillsDir, 'broken2.sh');
        const broken3 = resolve(skillsDir, 'broken3.sh');
        writeFileSync(broken1, '#!/bin/bash\necho "broken1"');
        writeFileSync(broken2, '#!/bin/bash\necho "broken2"');
        writeFileSync(broken3, '#!/bin/bash\necho "broken3"');
        // intentionally NOT chmod any of them

        const role = createTestRole({ slug: 'test', skillsDir });
        const registry = createTestRegistry([role]);

        const error = await getError(() =>
          assertRegistrySkillsExecutable({ registry }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
        expect(error?.message).toContain(broken1);
        expect(error?.message).toContain(broken2);
        expect(error?.message).toContain(broken3);
        expect(error?.message).toContain('chmod +x');
      });
    });
  });
});
