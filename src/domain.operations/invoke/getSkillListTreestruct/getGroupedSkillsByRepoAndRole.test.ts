import { given, then, when } from 'test-fns';

import { RoleSkillExecutable } from '@src/domain.objects/RoleSkillExecutable';

import { getGroupedSkillsByRepoAndRole } from './getGroupedSkillsByRepoAndRole';

describe('getGroupedSkillsByRepoAndRole', () => {
  given('[case1] single repo, single role', () => {
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

    when('[t0] grouped', () => {
      then('returns single repo with single role', () => {
        const result = getGroupedSkillsByRepoAndRole({ skills });
        expect(result).toHaveLength(1);
        expect(result[0]!.slugRepo).toBe('.this');
        expect(result[0]!.roles).toHaveLength(1);
        expect(result[0]!.roles[0]!.slugRole).toBe('any');
        expect(result[0]!.roles[0]!.skills).toHaveLength(2);
      });

      then('skills are sorted by slug', () => {
        const result = getGroupedSkillsByRepoAndRole({ skills });
        const slugs = result[0]!.roles[0]!.skills.map((s) => s.slug);
        expect(slugs).toEqual(['echo-args', 'say-hello']);
      });
    });
  });

  given('[case2] multi repo, multi role', () => {
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

    when('[t0] grouped', () => {
      then('returns repos sorted alphabetically', () => {
        const result = getGroupedSkillsByRepoAndRole({ skills });
        expect(result).toHaveLength(2);
        expect(result[0]!.slugRepo).toBe('.this');
        expect(result[1]!.slugRepo).toBe('test');
      });

      then('roles within repo are sorted alphabetically', () => {
        const result = getGroupedSkillsByRepoAndRole({ skills });
        const testRepo = result.find((r) => r.slugRepo === 'test')!;
        expect(testRepo.roles).toHaveLength(2);
        expect(testRepo.roles[0]!.slugRole).toBe('designer');
        expect(testRepo.roles[1]!.slugRole).toBe('mechanic');
      });
    });
  });

  given('[case3] empty skills array', () => {
    when('[t0] grouped', () => {
      then('returns empty array', () => {
        const result = getGroupedSkillsByRepoAndRole({ skills: [] });
        expect(result).toEqual([]);
      });
    });
  });
});
