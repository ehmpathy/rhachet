import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainOutput } from '@src/.test.assets/genMockedBrainOutput';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { ACTOR_ASK_DEFAULT_SCHEMA, actorAsk } from './actorAsk';

// mock getRoleBriefs to avoid .agent/ directory requirement in unit tests
jest.mock('@src/domain.operations/role/getRoleBriefs', () => ({
  getRoleBriefs: jest.fn().mockResolvedValue([]),
}));

describe('actorAsk', () => {
  // create test role
  const testRole = new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'test role for unit tests',
    readme: { uri: '.test/readme.md' },
    traits: [],
    skills: {
      dirs: { uri: '.agent/repo=.this/role=tester/skills' },
      refs: [],
    },
    briefs: { dirs: { uri: '.agent/repo=.this/role=tester/briefs' } },
  });

  // create mock BrainRepl
  // note: brain.ask returns BrainOutput with schema-validated output
  const mockBrainRepl = new BrainRepl({
    repo: 'anthropic',
    slug: 'anthropic/claude',
    description: 'mock brain repl for tests',
    spec: genSampleBrainSpec(),
    act: jest.fn().mockResolvedValue(
      genMockedBrainOutput({
        output: { summary: 'test summary' },
        brainChoice: 'repl',
      }),
    ),
    ask: jest.fn().mockResolvedValue(
      genMockedBrainOutput({
        output: { answer: 'hello from the repl' },
        brainChoice: 'repl',
      }),
    ),
  });

  // create mock BrainAtom (no .act() method)
  const mockBrainAtom = new BrainAtom({
    repo: 'xai',
    slug: 'xai/grok',
    description: 'mock brain atom for tests',
    spec: genSampleBrainSpec(),
    ask: jest.fn().mockResolvedValue(
      genMockedBrainOutput({
        output: { answer: 'hello from the atom' },
        brainChoice: 'atom',
      }),
    ),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // pin the caller to a no-tty depth-0 spawn, so the depth scope reads the var
  // as a brain's tool shell does, whatever terminal or clone runs the suite
  const ttyBefore = process.stdin.isTTY;
  const depthBefore = process.env[CLONE_ENV_KEYS.depth];
  beforeAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
  });
  beforeEach(() => {
    process.env[CLONE_ENV_KEYS.depth] = '0';
  });
  afterAll(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: ttyBefore,
      configurable: true,
    });
    delete process.env[CLONE_ENV_KEYS.depth];
    if (depthBefore !== undefined)
      process.env[CLONE_ENV_KEYS.depth] = depthBefore;
  });

  given('[case1] a valid role and brain', () => {
    when('[t0] actorAsk is called with a prompt', () => {
      then('invokes brain.ask with the prompt', async () => {
        await actorAsk({
          role: testRole,
          brain: mockBrainRepl,
          prompt: 'what is the meaning of life?',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(mockBrainRepl.ask).toHaveBeenCalledTimes(1);
        expect(mockBrainRepl.ask).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: 'what is the meaning of life?',
          }),
          undefined, // context is undefined when not provided
        );
      });

      then('returns the answer from brain.ask', async () => {
        const result = await actorAsk({
          role: testRole,
          brain: mockBrainRepl,
          prompt: 'hello',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result.output).toEqual({ answer: 'hello from the repl' });
      });
    });
  });

  given('[case2] default schema { answer: string }', () => {
    when('[t0] actorAsk is called with default schema', () => {
      then('returns { answer: string } shape', async () => {
        const result = await actorAsk({
          role: testRole,
          brain: mockBrainRepl,
          prompt: 'test',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result.output).toHaveProperty('answer');
        expect(typeof result.output.answer).toEqual('string');
      });
    });
  });

  given('[case3] a BrainAtom brain (no .act() method)', () => {
    when('[t0] actorAsk is called with a prompt', () => {
      then('invokes brain.ask with the prompt', async () => {
        await actorAsk({
          role: testRole,
          brain: mockBrainAtom,
          prompt: 'what is your favorite color?',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(mockBrainAtom.ask).toHaveBeenCalledTimes(1);
        expect(mockBrainAtom.ask).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: 'what is your favorite color?',
          }),
          undefined, // context is undefined when not provided
        );
      });

      then('returns the answer from brain.ask', async () => {
        const result = await actorAsk({
          role: testRole,
          brain: mockBrainAtom,
          prompt: 'hello',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        expect(result.output).toEqual({ answer: 'hello from the atom' });
      });
    });
  });

  given('[case4] custom schema passthrough', () => {
    when('[t0] actorAsk is called with custom schema', () => {
      // mock brain to return custom shape
      const mockBrainCustom = new BrainRepl({
        repo: 'test',
        slug: 'test/custom',
        description: 'mock for custom schema',
        spec: genSampleBrainSpec(),
        act: jest.fn(),
        ask: jest.fn().mockResolvedValue(
          genMockedBrainOutput({
            output: { score: 42, label: 'high' },
            brainChoice: 'repl',
          }),
        ),
      });

      then('returns custom schema shape', async () => {
        const customSchema = z.object({
          score: z.number(),
          label: z.string(),
        });

        const result = await actorAsk({
          role: testRole,
          brain: mockBrainCustom,
          prompt: 'rate this',
          schema: { output: customSchema },
        });

        expect(result.output).toEqual({ score: 42, label: 'high' });
        expect(result.output.score).toEqual(42);
        expect(result.output.label).toEqual('high');
      });
    });
  });

  given('[case5] type inference tests', () => {
    when('[t0] types are checked at compile time', () => {
      then('default schema infers { answer: string }', async () => {
        const result = await actorAsk({
          role: testRole,
          brain: mockBrainRepl,
          prompt: 'test',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });

        // positive: answer exists
        const _answer: string = result.output.answer;
        expect(_answer).toBeDefined();

        // negative: response does not exist
        // @ts-expect-error - response property does not exist on { answer: string }
        const _response = result.output.response;
        expect(_response).toBeUndefined();
      });

      then('custom schema infers custom type', async () => {
        const customSchema = z.object({ count: z.number() });
        const mockBrain = new BrainAtom({
          repo: 'test',
          slug: 'test/mock',
          description: 'mock',
          spec: genSampleBrainSpec(),
          ask: jest.fn().mockResolvedValue(
            genMockedBrainOutput({
              output: { count: 5 },
              brainChoice: 'atom',
            }),
          ),
        });

        const result = await actorAsk({
          role: testRole,
          brain: mockBrain,
          prompt: 'count',
          schema: { output: customSchema },
        });

        // positive: count exists as number
        const _count: number = result.output.count;
        expect(_count).toEqual(5);

        // negative: answer does not exist on custom schema
        // @ts-expect-error - answer property does not exist on { count: number }
        const _answer = result.output.answer;
        expect(_answer).toBeUndefined();
      });
    });
  });

  given('[case6] a caller at depth 1, as a review clone is', () => {
    when('[t0] actorAsk is called with a repl, as `rhx ask` does', () => {
      then('it is refused as a constraint, and no brain runs', async () => {
        process.env[CLONE_ENV_KEYS.depth] = '1';
        const error = await getError(() =>
          actorAsk({
            role: testRole,
            brain: mockBrainRepl,
            prompt: 'hello',
            schema: ACTOR_ASK_DEFAULT_SCHEMA,
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('clone spawn depth limit reached');
        expect(mockBrainRepl.ask).not.toHaveBeenCalled();
      });
    });

    when('[t1] actorAsk is called with an atom', () => {
      then(
        'it runs: an atom is one inference call, never a spawn',
        async () => {
          process.env[CLONE_ENV_KEYS.depth] = '1';
          const result = await actorAsk({
            role: testRole,
            brain: mockBrainAtom,
            prompt: 'hello',
            schema: ACTOR_ASK_DEFAULT_SCHEMA,
          });
          expect(result.output).toEqual({ answer: 'hello from the atom' });
          expect(mockBrainAtom.ask).toHaveBeenCalledTimes(1);
        },
      );
    });
  });

  given('[case7] a caller at depth 0', () => {
    when('[t0] actorAsk is called with a repl', () => {
      then('the brain reads depth 1, the depth it is born at', async () => {
        const seen: Array<string | undefined> = [];
        const brainRecorder = new BrainRepl({
          repo: 'test',
          slug: 'test/recorder',
          description: 'records the depth it runs at',
          spec: genSampleBrainSpec(),
          act: jest.fn(),
          ask: (async () => {
            seen.push(process.env[CLONE_ENV_KEYS.depth]);
            return genMockedBrainOutput({
              output: { answer: 'recorded' },
              brainChoice: 'repl',
            });
          }) as unknown as BrainRepl['ask'],
        });
        await actorAsk({
          role: testRole,
          brain: brainRecorder,
          prompt: 'hello',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });
        expect(seen).toEqual(['1']);
        expect(process.env[CLONE_ENV_KEYS.depth]).toEqual('0');
      });
    });
  });
});
