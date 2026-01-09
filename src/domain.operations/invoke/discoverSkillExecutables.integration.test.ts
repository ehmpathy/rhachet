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

describe('discoverSkillExecutables.integration', () => {
  const testDir = resolve(
    __dirname,
    './.temp/discoverSkillExecutables.integration',
  );
  const originalCwd = process.cwd();

  beforeAll(() => {
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

  given('broken symlink in skills directory', () => {
    beforeEach(() => {
      const skillsDir = resolve(testDir, '.agent/repo=.this/role=any/skills');
      mkdirSync(skillsDir, { recursive: true });

      // create a valid skill
      writeFileSync(
        resolve(skillsDir, 'valid-skill.sh'),
        '#!/usr/bin/env bash\necho valid',
      );
      chmodSync(resolve(skillsDir, 'valid-skill.sh'), '755');

      // create a broken symlink (points to nonexistent target)
      symlinkSync(
        resolve(skillsDir, 'nonexistent-target.sh'),
        resolve(skillsDir, 'broken-link.sh'),
      );
    });

    when('skill discovery runs', () => {
      then('does not throw ENOENT error', () => {
        expect(() => discoverSkillExecutables({})).not.toThrow();
      });

      then('ignores broken symlink and finds valid skill', () => {
        const result = discoverSkillExecutables({});
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('valid-skill');
      });
    });
  });

  given('broken symlink in nested skills subdirectory', () => {
    beforeEach(() => {
      const nestedDir = resolve(
        testDir,
        '.agent/repo=.this/role=any/skills/claude.hooks',
      );
      mkdirSync(nestedDir, { recursive: true });

      // create a valid nested skill
      writeFileSync(
        resolve(nestedDir, 'pretooluse.sh'),
        '#!/usr/bin/env bash\necho hook',
      );
      chmodSync(resolve(nestedDir, 'pretooluse.sh'), '755');

      // create a broken symlink in nested dir
      symlinkSync(
        resolve(nestedDir, 'nonexistent.sh'),
        resolve(nestedDir, 'broken.sh'),
      );
    });

    when('skill discovery runs', () => {
      then('ignores broken symlink in nested directory', () => {
        const result = discoverSkillExecutables({});
        expect(result).toHaveLength(1);
        expect(result[0]?.slug).toBe('pretooluse');
      });
    });
  });

  given('broken symlink to entire skills directory', () => {
    beforeEach(() => {
      const roleDir = resolve(testDir, '.agent/repo=.this/role=any');
      mkdirSync(roleDir, { recursive: true });

      // create broken symlink for skills directory
      symlinkSync(
        resolve(roleDir, 'nonexistent-skills-source'),
        resolve(roleDir, 'skills'),
      );
    });

    when('skill discovery runs', () => {
      then('handles broken skills directory symlink gracefully', () => {
        expect(() => discoverSkillExecutables({})).not.toThrow();
        const result = discoverSkillExecutables({});
        expect(result).toEqual([]);
      });
    });
  });

  given('mixed valid and broken symlinks across repos', () => {
    beforeEach(() => {
      // repo=.this with valid skill
      const thisSkillsDir = resolve(
        testDir,
        '.agent/repo=.this/role=any/skills',
      );
      mkdirSync(thisSkillsDir, { recursive: true });
      writeFileSync(
        resolve(thisSkillsDir, 'local.sh'),
        '#!/usr/bin/env bash\necho local',
      );
      chmodSync(resolve(thisSkillsDir, 'local.sh'), '755');

      // repo=ehmpathy with broken symlink
      const ehmpathySkillsDir = resolve(
        testDir,
        '.agent/repo=ehmpathy/role=mechanic/skills',
      );
      mkdirSync(ehmpathySkillsDir, { recursive: true });
      symlinkSync(
        resolve(ehmpathySkillsDir, 'nonexistent.sh'),
        resolve(ehmpathySkillsDir, 'broken.sh'),
      );
      writeFileSync(
        resolve(ehmpathySkillsDir, 'remote.sh'),
        '#!/usr/bin/env bash\necho remote',
      );
      chmodSync(resolve(ehmpathySkillsDir, 'remote.sh'), '755');
    });

    when('skill discovery runs', () => {
      then(
        'finds valid skills from both repos, ignores broken symlinks',
        () => {
          const result = discoverSkillExecutables({});
          expect(result).toHaveLength(2);
          expect(result.map((s) => s.slug).sort()).toEqual(['local', 'remote']);
        },
      );
    });
  });
});
