import { given, then, when } from 'test-fns';

import { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { getSkillListTreestruct } from './getSkillListTreestruct';

describe('getSkillListTreestruct', () => {
  given('[case1] single repo output', () => {
    const skills = [
      new RoleSkillExecutable({
        slug: 'say-hello',
        path: '/path/to/say-hello.sh',
        slugRepo: '.this',
        slugRole: 'any',
      }),
      new RoleSkillExecutable({
        slug: 'echo-args',
        path: '/path/to/echo-args.sh',
        slugRepo: '.this',
        slugRole: 'any',
      }),
    ];

    when('[t0] no pattern, no truncation', () => {
      then('shows treestruct header and count', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: null,
          truncate: true,
        });
        expect(result[0]).toBe('🪨 rhx list');
        expect(result[1]).toBe('   ├─ 2 skills found');
        expect(result).toMatchSnapshot();
      });
    });

    when('[t1] with contains pattern', () => {
      then('header shows wrapped pattern', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: 'hello',
          truncate: true,
        });
        expect(result[0]).toBe("🪨 rhx list '*hello*'");
      });
    });
  });

  given('[case2] multi repo output', () => {
    const skills = [
      new RoleSkillExecutable({
        slug: 'wireframe',
        path: '/path/to/wireframe.sh',
        slugRepo: 'test',
        slugRole: 'designer',
      }),
      new RoleSkillExecutable({
        slug: 'git.commit',
        path: '/path/to/git.commit.sh',
        slugRepo: 'test',
        slugRole: 'mechanic',
      }),
      new RoleSkillExecutable({
        slug: 'say-hello',
        path: '/path/to/say-hello.sh',
        slugRepo: '.this',
        slugRole: 'any',
      }),
    ];

    when('[t0] no pattern', () => {
      then('shows repos and roles in tree', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: null,
          truncate: true,
        });
        expect(result).toContain('   ├─ repo=.this');
        expect(result).toContain('   └─ repo=test');
        expect(result[1]).toBe('   ├─ 3 skills found');
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case3] 0 skills', () => {
    when('[t0] no skills', () => {
      then('shows hint line', () => {
        const result = getSkillListTreestruct({
          skills: [],
          pattern: null,
          truncate: true,
        });
        expect(result).toContain(
          '      └─ hint: run `rhachet roles link` to add skills',
        );
      });

      then('shows zero count and snapshot', () => {
        const result = getSkillListTreestruct({
          skills: [],
          pattern: null,
          truncate: true,
        });
        expect(result[1]).toBe('   └─ 0 skills found');
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case4] 10 skills (no truncation boundary)', () => {
    const skills = Array.from(
      { length: 10 },
      (_, i) =>
        new RoleSkillExecutable({
          slug: `skill-${String(i).padStart(2, '0')}`,
          path: `/path/to/skill-${i}.sh`,
          slugRepo: 'test',
          slugRole: 'mechanic',
        }),
    );

    when('[t0] truncate enabled', () => {
      then('shows all 10 skills', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: null,
          truncate: true,
        });
        expect(result.filter((l) => l.includes('skill-'))).toHaveLength(10);
      });

      then('no truncation message', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: null,
          truncate: true,
        });
        expect(result.some((l) => l.includes('more'))).toBe(false);
      });
    });
  });

  given('[case5] 12 skills (truncation)', () => {
    const skills = Array.from(
      { length: 12 },
      (_, i) =>
        new RoleSkillExecutable({
          slug: `skill-${String(i).padStart(2, '0')}`,
          path: `/path/to/skill-${i}.sh`,
          slugRepo: 'test',
          slugRole: 'mechanic',
        }),
    );

    when('[t0] truncate enabled', () => {
      then('shows first 10 skills', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: null,
          truncate: true,
        });
        expect(result.filter((l) => l.includes('skill-'))).toHaveLength(10);
      });

      then('shows truncation message', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: null,
          truncate: true,
        });
        expect(result.some((l) => l.includes('2 more'))).toBe(true);
      });

      then('shows truncation in snapshot', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: null,
          truncate: true,
        });
        expect(result[1]).toBe('   ├─ 12 skills found');
        expect(result).toMatchSnapshot();
      });
    });

    when('[t1] truncate disabled (--all)', () => {
      then('shows all 12 skills', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: null,
          truncate: false,
        });
        expect(result.filter((l) => l.includes('skill-'))).toHaveLength(12);
      });

      then('no truncation message', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: null,
          truncate: false,
        });
        expect(result.some((l) => l.includes('more'))).toBe(false);
      });
    });
  });

  given('[case6] glob pattern', () => {
    const skills = [
      new RoleSkillExecutable({
        slug: 'git.commit.set',
        path: '/path/to/git.commit.set.sh',
        slugRepo: 'test',
        slugRole: 'mechanic',
      }),
      new RoleSkillExecutable({
        slug: 'git.commit.push',
        path: '/path/to/git.commit.push.sh',
        slugRepo: 'test',
        slugRole: 'mechanic',
      }),
      new RoleSkillExecutable({
        slug: 'radio.task.push',
        path: '/path/to/radio.task.push.sh',
        slugRepo: 'test',
        slugRole: 'mechanic',
      }),
    ];

    when('[t0] glob pattern git.*', () => {
      then('header shows glob as-is', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: 'git.*',
          truncate: true,
        });
        expect(result[0]).toBe("🪨 rhx list 'git.*'");
      });

      then('filters to git skills only', () => {
        const result = getSkillListTreestruct({
          skills,
          pattern: 'git.*',
          truncate: true,
        });
        expect(result[1]).toBe('   ├─ 2 skills found');
      });
    });
  });
});
