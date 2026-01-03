import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { Role } from '@src/domain.objects/Role';

import { findActorRoleSkillBySlug } from './findActorRoleSkillBySlug';

jest.mock('@src/domain.operations/invoke/discoverSkillExecutables', () => ({
  discoverSkillExecutables: jest.fn(),
}));

import { discoverSkillExecutables } from '@src/domain.operations/invoke/discoverSkillExecutables';

const mockDiscoverSkillExecutables = discoverSkillExecutables as jest.Mock;

describe('findActorRoleSkillBySlug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default mock returns empty array (no executables found)
    mockDiscoverSkillExecutables.mockReturnValue([]);
  });

  // create test role with typed skills
  const testRole = new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'test role for unit tests',
    readme: { uri: '.test/readme.md' }, // 'a role for testing findActorRoleSkillBySlug',
    traits: [],
    skills: {
      solid: {
        wordcount: {
          input: z.object({ text: z.string() }),
          output: z.object({ count: z.number() }),
        },
      },
      rigid: {
        summarize: {
          input: z.object({ content: z.string() }),
          output: z.object({ summary: z.string() }),
        },
      },
      dirs: { uri: '.agent/repo=.this/role=tester/skills' },
      refs: [],
    },
    briefs: { dirs: { uri: '.agent/repo=.this/role=tester/briefs' } },
  });

  given('[case1] role.skills.solid has the skill with executable', () => {
    when('[t0] skill is found by slug', () => {
      then('returns skill from role.skills with source="role.skills"', () => {
        // mock executable found
        mockDiscoverSkillExecutables.mockReturnValue([
          { path: '/fake/.agent/skills/wordcount.sh', name: 'wordcount.sh' },
        ]);

        const result = findActorRoleSkillBySlug({
          slug: 'wordcount',
          role: testRole,
          route: 'solid',
        });
        expect(result.slug).toEqual('wordcount');
        expect(result.route).toEqual('solid');
        expect(result.source).toEqual('role.skills');
        expect(result.schema).toBeDefined();
        expect(result.executable).toBeDefined();
      });
    });
  });

  given('[case2] role.skills.rigid has the skill with executable', () => {
    when('[t0] skill is found by slug', () => {
      then('returns skill from role.skills with source="role.skills"', () => {
        // mock executable found
        mockDiscoverSkillExecutables.mockReturnValue([
          { path: '/fake/.agent/skills/summarize.sh', name: 'summarize.sh' },
        ]);

        const result = findActorRoleSkillBySlug({
          slug: 'summarize',
          role: testRole,
          route: 'rigid',
        });
        expect(result.slug).toEqual('summarize');
        expect(result.route).toEqual('rigid');
        expect(result.source).toEqual('role.skills');
        expect(result.schema).toBeDefined();
        expect(result.executable).toBeDefined();
      });
    });
  });

  given(
    '[case2b] solid skill declared in role.skills but no executable',
    () => {
      when(
        '[t0] skill exists in role.skills.solid but no .agent/ executable',
        () => {
          then('throws BadRequestError with helpful hint', async () => {
            // default mock returns empty array (no executables)
            const error = await getError(() =>
              findActorRoleSkillBySlug({
                slug: 'wordcount',
                role: testRole,
                route: 'solid',
              }),
            );
            expect(error).toBeDefined();
            expect(error.message).toContain('declared in role.skills.solid');
            expect(error.message).toContain('no executable found');
          });
        },
      );
    },
  );

  given(
    '[case2c] rigid skill declared in role.skills but no executable',
    () => {
      when(
        '[t0] skill exists in role.skills.rigid but no .agent/ executable',
        () => {
          then('throws BadRequestError with helpful hint', async () => {
            // default mock returns empty array (no executables)
            const error = await getError(() =>
              findActorRoleSkillBySlug({
                slug: 'summarize',
                role: testRole,
                route: 'rigid',
              }),
            );
            expect(error).toBeDefined();
            expect(error.message).toContain('declared in role.skills.rigid');
            expect(error.message).toContain('no executable found');
          });
        },
      );
    },
  );

  given('[case3] skill not in role.skills[route]', () => {
    when('[t0] skill slug does not exist', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          findActorRoleSkillBySlug({
            slug: 'nonexistent',
            role: testRole,
            route: 'solid',
          }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain('skill not found');
      });
    });

    when('[t1] skill exists in wrong route', () => {
      then(
        'throws BadRequestError for solid looking for rigid skill',
        async () => {
          const error = await getError(() =>
            findActorRoleSkillBySlug({
              slug: 'summarize', // exists in rigid, not solid
              role: testRole,
              route: 'solid',
            }),
          );
          expect(error).toBeDefined();
          expect(error.message).toContain('skill not found');
        },
      );
    });
  });

  given('[case4] skill exists in both role.skills and .agent/ dirs', () => {
    when('[t0] findActorRoleSkillBySlug is called for solid skill', () => {
      then('role.skills.solid takes precedence over .agent/ dirs', () => {
        // mock .agent/ discovery to return an executable
        mockDiscoverSkillExecutables.mockReturnValue([
          { path: '/fake/.agent/skills/wordcount.sh', name: 'wordcount.sh' },
        ]);

        const result = findActorRoleSkillBySlug({
          slug: 'wordcount',
          role: testRole,
          route: 'solid',
        });

        // source should be 'role.skills', not '.agent/'
        expect(result.source).toEqual('role.skills');
        expect(result.schema).toBeDefined();
        // executable from .agent/ is still attached
        expect(result.executable).toBeDefined();
      });
    });

    when('[t1] findActorRoleSkillBySlug is called for rigid skill', () => {
      then('role.skills.rigid takes precedence over .agent/ dirs', () => {
        // mock .agent/ discovery to return an executable
        mockDiscoverSkillExecutables.mockReturnValue([
          { path: '/fake/.agent/skills/summarize.sh', name: 'summarize.sh' },
        ]);

        const result = findActorRoleSkillBySlug({
          slug: 'summarize',
          role: testRole,
          route: 'rigid',
        });

        // source should be 'role.skills', not '.agent/'
        expect(result.source).toEqual('role.skills');
        expect(result.schema).toBeDefined();
        // executable from .agent/ is still attached
        expect(result.executable).toBeDefined();
      });
    });
  });

  given('[case5] skill exists only in .agent/ dirs (no schema)', () => {
    when(
      '[t0] findActorRoleSkillBySlug is called for skill not in role.skills',
      () => {
        then(
          'throws BadRequestError requiring schema for actor contracts',
          () => {
            // mock .agent/ discovery to return an executable for unknown skill
            mockDiscoverSkillExecutables.mockReturnValue([
              {
                path: '/fake/.agent/skills/discovered.sh',
                name: 'discovered.sh',
              },
            ]);

            // skills without schemas cannot be used via actor contracts
            expect(() =>
              findActorRoleSkillBySlug({
                slug: 'discovered',
                role: testRole,
                route: 'solid',
              }),
            ).toThrow(
              'skill "discovered" found in .agent/ but lacks schema in role.skills.solid',
            );
          },
        );
      },
    );
  });
});
