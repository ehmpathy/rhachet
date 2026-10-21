import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { ActorRoleSkill } from '@src/domain.objects/ActorRoleSkill';
import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

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
    readme: { uri: '.test/readme.md' }, // 'a role for testing actorAct',
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

  // pin the caller to a no-tty depth-0 work clone, so the spawn scope reads the vars
  // as a brain's tool shell does, whatever terminal or clone runs the suite. it is
  // suite-wide on purpose: every case's repl call passes the leaf check, so a suite run
  // inside a leaf clone would refuse the extant cases too
  const ttyBefore = process.stdin.isTTY;
  const depthBefore = process.env[CLONE_ENV_KEYS.depth];
  const leafBefore = process.env[CLONE_ENV_KEYS.leaf];
  beforeAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
  });
  beforeEach(() => {
    process.env[CLONE_ENV_KEYS.depth] = '0';
    delete process.env[CLONE_ENV_KEYS.leaf];
  });
  afterAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: ttyBefore,
      configurable: true,
    });
    delete process.env[CLONE_ENV_KEYS.depth];
    delete process.env[CLONE_ENV_KEYS.leaf];
    if (depthBefore !== undefined)
      process.env[CLONE_ENV_KEYS.depth] = depthBefore;
    if (leafBefore !== undefined) process.env[CLONE_ENV_KEYS.leaf] = leafBefore;
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
          undefined, // context is undefined when not provided
        );
      });

      then(
        'returns the result from brain.act wrapped in BrainOutput',
        async () => {
          const result = await actorAct({
            role: testRole,
            brain: mockBrain,
            skill: testSkill,
            args: { content: 'hello world' },
          });

          // result is normalized to BrainOutput; .output holds the actual data
          expect(result.output).toEqual({ summary: 'test summary' });
          expect(result.metrics).toBeDefined();
        },
      );
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
          undefined, // context is undefined when not provided
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
          undefined, // context is undefined when not provided
        );
      });
    });
  });

  given('[case3] a reviewer caller — it carries the leaf mark', () => {
    when('[t0] actorAct is called, as `rhachet act` and `clone.act` do', () => {
      then('it is refused as a constraint, and no brain runs', async () => {
        process.env[CLONE_ENV_KEYS.depth] = '1';
        process.env[CLONE_ENV_KEYS.leaf] = '1';
        const error = await getError(() =>
          actorAct({
            role: testRole,
            brain: mockBrain,
            skill: testSkill,
            args: { content: 'hello' },
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('a leaf clone may not spawn');
        expect(mockBrain.act).not.toHaveBeenCalled();
      });
    });
  });

  given('[case3b] a work clone at depth 1 — a driver with no tty', () => {
    // 🔴 the #577 defect: the old absolute cap refused this caller's every act
    when('[t0] actorAct is called', () => {
      then('it runs, and the brain reads depth 2 as a leaf', async () => {
        process.env[CLONE_ENV_KEYS.depth] = '1';
        const seen: Array<{ depth?: string; leaf?: string }> = [];
        const brainRecorder = {
          ...mockBrain,
          act: async () => {
            seen.push({
              depth: process.env[CLONE_ENV_KEYS.depth],
              leaf: process.env[CLONE_ENV_KEYS.leaf],
            });
            return { summary: 'test summary' };
          },
        } as unknown as BrainRepl;
        await actorAct({
          role: testRole,
          brain: brainRecorder,
          skill: testSkill,
          args: { content: 'hello' },
        });
        expect(seen).toEqual([{ depth: '2', leaf: '1' }]);
        expect(process.env[CLONE_ENV_KEYS.leaf]).toBeUndefined();
      });
    });
  });

  given('[case4] a caller at depth 0', () => {
    when('[t0] actorAct is called', () => {
      then('the brain reads depth 1, the depth it is born at', async () => {
        const seen: Array<string | undefined> = [];
        const brainRecorder = {
          ...mockBrain,
          act: async () => {
            seen.push(process.env[CLONE_ENV_KEYS.depth]);
            return { summary: 'test summary' };
          },
        } as unknown as BrainRepl;
        await actorAct({
          role: testRole,
          brain: brainRecorder,
          skill: testSkill,
          args: { content: 'hello' },
        });
        expect(seen).toEqual(['1']);
        expect(process.env[CLONE_ENV_KEYS.depth]).toEqual('0');
      });
    });
  });
});
