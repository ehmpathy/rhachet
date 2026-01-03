import { getError, given, then, when } from 'test-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { findUniqueSkillExecutable } from './findUniqueSkillExecutable';

describe('findUniqueSkillExecutable', () => {
  const testDir = resolve(__dirname, './.temp/findUniqueSkillExecutable');
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

  given('skill exists in exactly one location', () => {
    beforeEach(() => {
      const skillsDir = resolve(testDir, '.agent/repo=.this/role=any/skills');
      mkdirSync(skillsDir, { recursive: true });
      writeFileSync(
        resolve(skillsDir, 'init.sh'),
        '#!/usr/bin/env bash\necho init',
      );
      chmodSync(resolve(skillsDir, 'init.sh'), '755');
    });

    when('finding by slugSkill only', () => {
      then('returns the unique skill', () => {
        const result = findUniqueSkillExecutable({ slugSkill: 'init' });
        expect(result.slug).toBe('init');
        expect(result.slugRepo).toBe('.this');
        expect(result.slugRole).toBe('any');
      });
    });

    when('finding with explicit repo filter', () => {
      then('returns the skill', () => {
        const result = findUniqueSkillExecutable({
          slugSkill: 'init',
          slugRepo: '.this',
        });
        expect(result.slug).toBe('init');
      });
    });

    when('finding with explicit role filter', () => {
      then('returns the skill', () => {
        const result = findUniqueSkillExecutable({
          slugSkill: 'init',
          slugRole: 'any',
        });
        expect(result.slug).toBe('init');
      });
    });
  });

  given('skill does not exist but other skills do', () => {
    beforeEach(() => {
      const skillsDir = resolve(testDir, '.agent/repo=.this/role=any/skills');
      mkdirSync(skillsDir, { recursive: true });
      writeFileSync(resolve(skillsDir, 'init.sh'), '#!/usr/bin/env bash');
      writeFileSync(resolve(skillsDir, 'build.sh'), '#!/usr/bin/env bash');
      writeFileSync(resolve(skillsDir, 'deploy.sh'), '#!/usr/bin/env bash');
      chmodSync(resolve(skillsDir, 'init.sh'), '755');
      chmodSync(resolve(skillsDir, 'build.sh'), '755');
      chmodSync(resolve(skillsDir, 'deploy.sh'), '755');
    });

    when('finding nonexistent skill', () => {
      then('error lists available skills', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'nonexistent' }),
        );
        expect(error?.message).toContain('available skills:');
        expect(error?.message).toContain('init');
        expect(error?.message).toContain('build');
        expect(error?.message).toContain('deploy');
      });

      then('error includes tip about linking roles', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'nonexistent' }),
        );
        expect(error?.message).toContain('tip:');
        expect(error?.message).toContain('npx rhachet roles link');
        expect(error?.message).toContain('--role');
      });
    });
  });

  given('skill does not exist', () => {
    beforeEach(() => {
      // create empty .agent structure
      mkdirSync(resolve(testDir, '.agent/repo=.this/role=any/skills'), {
        recursive: true,
      });
    });

    when('finding nonexistent skill', () => {
      then('throws error with skill name', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'nonexistent' }),
        );
        expect(error?.message).toContain('no skill "nonexistent" found');
      });

      then('error mentions "any linked role"', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'nonexistent' }),
        );
        expect(error?.message).toContain('in any linked role');
      });
    });

    when('finding with repo filter that has no match', () => {
      then('error mentions the repo filter', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({
            slugSkill: 'nonexistent',
            slugRepo: '.this',
          }),
        );
        expect(error?.message).toContain('--repo .this');
      });
    });

    when('finding with role filter that has no match', () => {
      then('error mentions the role filter', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({
            slugSkill: 'nonexistent',
            slugRole: 'any',
          }),
        );
        expect(error?.message).toContain('--role any');
      });
    });

    when('finding with both repo and role filters', () => {
      then('error mentions both filters', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({
            slugSkill: 'nonexistent',
            slugRepo: '.this',
            slugRole: 'any',
          }),
        );
        expect(error?.message).toContain('--repo .this');
        expect(error?.message).toContain('--role any');
      });
    });
  });

  given('skill exists in multiple locations', () => {
    beforeEach(() => {
      // same skill in two roles
      const dirs = [
        '.agent/repo=.this/role=mechanic/skills',
        '.agent/repo=.this/role=designer/skills',
      ];

      for (const dir of dirs) {
        mkdirSync(resolve(testDir, dir), { recursive: true });
        writeFileSync(resolve(testDir, dir, 'dupe.sh'), '#!/usr/bin/env bash');
        chmodSync(resolve(testDir, dir, 'dupe.sh'), '755');
      }
    });

    when('finding without disambiguation', () => {
      then('throws error about multiple matches', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'dupe' }),
        );
        expect(error?.message).toContain('multiple skills found');
      });

      then('error lists all matching locations', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'dupe' }),
        );
        expect(error?.message).toContain('role=mechanic');
        expect(error?.message).toContain('role=designer');
      });

      then('error suggests disambiguation flags', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'dupe' }),
        );
        expect(error?.message).toContain('--repo');
        expect(error?.message).toContain('--role');
      });
    });

    when('disambiguating with slugRole', () => {
      then('returns the correct skill', () => {
        const result = findUniqueSkillExecutable({
          slugSkill: 'dupe',
          slugRole: 'mechanic',
        });
        expect(result.slug).toBe('dupe');
        expect(result.slugRole).toBe('mechanic');
      });
    });
  });

  given('skill exists in multiple repos', () => {
    beforeEach(() => {
      // same skill in two repos
      const dirs = [
        '.agent/repo=.this/role=any/skills',
        '.agent/repo=ehmpathy/role=mechanic/skills',
      ];

      for (const dir of dirs) {
        mkdirSync(resolve(testDir, dir), { recursive: true });
        writeFileSync(
          resolve(testDir, dir, 'common.sh'),
          '#!/usr/bin/env bash',
        );
        chmodSync(resolve(testDir, dir, 'common.sh'), '755');
      }
    });

    when('finding without disambiguation', () => {
      then('throws error about multiple matches', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'common' }),
        );
        expect(error?.message).toContain('multiple skills found');
      });

      then('error lists both repos', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'common' }),
        );
        expect(error?.message).toContain('repo=.this');
        expect(error?.message).toContain('repo=ehmpathy');
      });
    });

    when('disambiguating with slugRepo', () => {
      then('returns the correct skill', () => {
        const result = findUniqueSkillExecutable({
          slugSkill: 'common',
          slugRepo: 'ehmpathy',
        });
        expect(result.slug).toBe('common');
        expect(result.slugRepo).toBe('ehmpathy');
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

    when('finding by slugSkill only', () => {
      then('returns the skill from external repo', () => {
        const result = findUniqueSkillExecutable({ slugSkill: 'deploy' });
        expect(result.slug).toBe('deploy');
        expect(result.slugRepo).toBe('ehmpathy');
        expect(result.slugRole).toBe('mechanic');
      });
    });

    when('finding with explicit external slugRepo', () => {
      then('returns the skill', () => {
        const result = findUniqueSkillExecutable({
          slugSkill: 'deploy',
          slugRepo: 'ehmpathy',
        });
        expect(result.slugRepo).toBe('ehmpathy');
      });
    });

    when('finding with wrong slugRepo filter', () => {
      then('throws error mentioning the filter', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({
            slugSkill: 'deploy',
            slugRepo: '.this',
          }),
        );
        expect(error?.message).toContain('no skill "deploy" found');
        expect(error?.message).toContain('--repo .this');
      });
    });
  });

  given('no .agent directory exists', () => {
    when('finding any skill', () => {
      then('throws helpful error', async () => {
        const error = await getError(() =>
          findUniqueSkillExecutable({ slugSkill: 'anything' }),
        );
        expect(error?.message).toContain('no skill "anything" found');
      });
    });
  });
});
