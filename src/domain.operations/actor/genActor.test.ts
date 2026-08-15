import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';

import { genActor } from './genActor';

// mock getRoleBriefs to avoid .agent/ directory requirement in unit tests
jest.mock('@src/domain.operations/role/getRoleBriefs', () => ({
  getRoleBriefs: jest.fn().mockResolvedValue([]),
}));

describe('genActor', () => {
  // create test role with typed skills
  const testRole = new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'test role for unit tests',
    readme: { uri: '.test/readme.md' },
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

  const secondRole = new Role({
    slug: 'lifeguard',
    name: 'Lifeguard',
    purpose: 'second role for multi-role tests',
    readme: { uri: '.test/readme.md' },
    traits: [],
    skills: {
      solid: {
        'waves.report': {
          input: z.object({ spot: z.string() }),
          output: z.object({ height: z.number() }),
        },
      },
      rigid: {},
      dirs: { uri: '.agent/repo=.this/role=lifeguard/skills' },
      refs: [],
    },
    briefs: { dirs: { uri: '.agent/repo=.this/role=lifeguard/briefs' } },
  });

  const mockBrainRepl = new BrainRepl({
    repo: 'anthropic',
    slug: 'anthropic/claude',
    description: 'mock brain repl',
    spec: genSampleBrainSpec(),
    act: jest.fn(),
    ask: jest.fn(),
  });

  given('[case1] genActor is called with an empty brains array', () => {
    when('[t0] the actor recipe is baked', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          genActor({ roles: [testRole], brains: [] }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain(
          'genActor requires at least one brain in allowlist',
        );
      });
    });
  });

  given('[case2] genActor is called with an empty roles array', () => {
    when('[t0] the actor recipe is baked', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          genActor({ roles: [], brains: [mockBrainRepl] }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain('genActor requires at least one role');
      });
    });
  });

  given(
    '[case3] genActor is called with a single role and valid brains',
    () => {
      const actor = genActor({ roles: [testRole], brains: [mockBrainRepl] });

      when('[t0] the actor recipe is baked', () => {
        then('carries the roles as a list', () => {
          expect(actor.roles).toHaveLength(1);
          expect(actor.roles[0]).toEqual(testRole);
        });

        then('carries the brains allowlist', () => {
          expect(actor.brains).toHaveLength(1);
          expect(actor.brains[0]).toEqual(mockBrainRepl);
        });

        then('is a recipe only — carries NO engage methods', () => {
          // the recipe is not engageable; genCloneInmem bakes the engageable clone
          const bag = actor as unknown as Record<string, unknown>;
          expect(bag.act).toBeUndefined();
          expect(bag.run).toBeUndefined();
          expect(bag.ask).toBeUndefined();
        });
      });
    },
  );

  given('[case4] genActor is called with multiple roles', () => {
    const actor = genActor({
      roles: [testRole, secondRole],
      brains: [mockBrainRepl],
    });

    when('[t0] the actor recipe is baked', () => {
      then('composes all roles in order', () => {
        expect(actor.roles.map((role) => role.slug)).toEqual([
          'tester',
          'lifeguard',
        ]);
      });
    });
  });
});
