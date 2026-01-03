import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';

import { actorAct } from './actorAct';

// mock getRoleBriefs to avoid .agent/ directory requirement in unit tests
jest.mock('@src/domain.operations/role/getRoleBriefs', () => ({
  getRoleBriefs: jest.fn().mockResolvedValue([]),
}));

describe('actorAct', () => {
  // create test role for briefs resolution
  const testRole = new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'test role for unit tests',
    readme: 'a role for testing actorAct',
    traits: [],
    skills: {
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

  // create test skill
  const testSkill = new ActorRoleSkill({
    slug: 'summarize',
    route: 'rigid',
    source: 'role.skills',
    schema: {
      input: z.object({ content: z.string() }),
      output: z.object({ summary: z.string() }),
    },
    executable: {
      slug: 'summarize',
      path: '/fake/.agent/skills/summarize.sh',
      slugRepo: '.this',
      slugRole: 'tester',
    },
  });

  // create mock brain
  const mockBrain = {
    repo: 'anthropic',
    slug: 'claude',
    description: 'mock brain for testing',
    act: jest.fn().mockResolvedValue({ summary: 'test summary' }),
    ask: jest.fn().mockResolvedValue('test response'),
  } as unknown as BrainRepl;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] a pre-resolved rigid skill', () => {
    when('[t0] actorAct is called with skill and args', () => {
      then('invokes brain.act with the skill', async () => {
        await actorAct({
          role: testRole,
          brain: mockBrain,
          skill: testSkill,
          args: { content: 'hello world' },
        });

        expect(mockBrain.act).toHaveBeenCalledTimes(1);
        expect(mockBrain.act).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining('summarize'),
          }),
        );
      });

      then('returns the result from brain.act', async () => {
        const result = await actorAct({
          role: testRole,
          brain: mockBrain,
          skill: testSkill,
          args: { content: 'hello world' },
        });

        expect(result).toEqual({ summary: 'test summary' });
      });
    });

    when('[t1] actorAct is called with different args', () => {
      then('passes args to brain.act prompt', async () => {
        await actorAct({
          role: testRole,
          brain: mockBrain,
          skill: testSkill,
          args: { content: 'different content' },
        });

        expect(mockBrain.act).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining('different content'),
          }),
        );
      });
    });
  });

  given('[case2] skill with schema', () => {
    when('[t0] actorAct is called', () => {
      then('uses schema.output in brain.act call', async () => {
        await actorAct({
          role: testRole,
          brain: mockBrain,
          skill: testSkill,
          args: { content: 'hello' },
        });

        expect(mockBrain.act).toHaveBeenCalledWith(
          expect.objectContaining({
            schema: expect.objectContaining({
              output: testSkill.schema.output,
            }),
          }),
        );
      });
    });
  });
});
