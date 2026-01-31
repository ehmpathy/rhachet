import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainOutput } from '@src/.test.assets/genMockedBrainOutput';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';

import { ACTOR_ASK_DEFAULT_SCHEMA } from './actorAsk';
import { genActor } from './genActor';

// mock getRoleBriefs to avoid .agent/ directory requirement in unit tests
jest.mock('@src/domain.operations/role/getRoleBriefs', () => ({
  getRoleBriefs: jest.fn().mockResolvedValue([]),
}));

// mock discoverSkillExecutables for findActorRoleSkillBySlug
jest.mock('@src/domain.operations/invoke/discoverSkillExecutables', () => ({
  discoverSkillExecutables: jest.fn(),
}));

// mock executeSkill to avoid actual shell execution
jest.mock('@src/domain.operations/invoke/executeSkill', () => ({
  executeSkill: jest.fn(),
}));

import { discoverSkillExecutables } from '@src/domain.operations/invoke/discoverSkillExecutables';

const mockDiscoverSkillExecutables = discoverSkillExecutables as jest.Mock;

describe('genActor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default: mock executable found for all skills
    mockDiscoverSkillExecutables.mockReturnValue([
      { path: '/fake/.agent/skills/skill.sh', name: 'skill.sh' },
    ]);
  });

  // create test role with typed skills
  const testRole = new Role({
    slug: 'tester',
    name: 'Tester',
    purpose: 'test role for unit tests',
    readme: { uri: '.test/readme.md' }, // 'a role for testing genActor',
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

  // create mock BrainRepl instances
  const mockBrainRepl1 = new BrainRepl({
    repo: 'anthropic',
    slug: 'anthropic/claude',
    description: 'mock brain repl 1',
    spec: genSampleBrainSpec(),
    act: jest.fn().mockResolvedValue(
      genMockedBrainOutput({
        output: { summary: 'test summary' },
        brainChoice: 'repl',
      }),
    ),
    ask: jest.fn().mockResolvedValue(
      genMockedBrainOutput({
        output: { response: 'test response' },
        brainChoice: 'repl',
      }),
    ),
  });

  const mockBrainRepl2 = new BrainRepl({
    repo: 'openai',
    slug: 'openai/codex',
    description: 'mock brain repl 2',
    spec: genSampleBrainSpec(),
    act: jest.fn().mockResolvedValue(
      genMockedBrainOutput({
        output: { summary: 'codex summary' },
        brainChoice: 'repl',
      }),
    ),
    ask: jest.fn().mockResolvedValue(
      genMockedBrainOutput({
        output: { response: 'codex response' },
        brainChoice: 'repl',
      }),
    ),
  });

  // create mock BrainAtom instance (no .act() method)
  const mockBrainAtom = new BrainAtom({
    repo: 'xai',
    slug: 'xai/grok',
    description: 'mock brain atom',
    spec: genSampleBrainSpec(),
    ask: jest.fn().mockResolvedValue(
      genMockedBrainOutput({
        output: { response: 'atom response' },
        brainChoice: 'atom',
      }),
    ),
  });

  given('[case1] genActor is called with empty brains array', () => {
    when('[t0] attempting to create actor', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          genActor({ role: testRole, brains: [] }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain(
          'genActor requires at least one brain in allowlist',
        );
      });
    });
  });

  given('[case2] genActor is called with valid brains', () => {
    const actor = genActor({
      role: testRole,
      brains: [mockBrainRepl1, mockBrainRepl2],
    });

    when('[t0] actor is created', () => {
      then('has role property', () => {
        expect(actor.role).toEqual(testRole);
      });

      then('has brains array', () => {
        expect(actor.brains).toHaveLength(2);
        expect(actor.brains[0]).toEqual(mockBrainRepl1);
      });

      then('has act method', () => {
        expect(typeof actor.act).toEqual('function');
      });

      then('has run method', () => {
        expect(typeof actor.run).toEqual('function');
      });

      then('has ask method', () => {
        expect(typeof actor.ask).toEqual('function');
      });
    });

    when('[t1] act is called without brain', () => {
      then('uses default brain (first in allowlist)', async () => {
        await actor.act({ skill: { summarize: { content: 'test' } } });
        expect(mockBrainRepl1.act).toHaveBeenCalled();
      });
    });

    when('[t2] act is called with explicit brain ref', () => {
      then('uses specified brain from allowlist', async () => {
        await actor.act({
          brain: { repo: 'openai', slug: 'openai/codex' },
          skill: { summarize: { content: 'test' } },
        });
        expect(mockBrainRepl2.act).toHaveBeenCalled();
      });
    });

    when('[t3] act is called with explicit brain (direct pass-in)', () => {
      then('uses passed BrainRepl instance from allowlist', async () => {
        await actor.act({
          brain: mockBrainRepl2, // pass BrainRepl directly, not { repo, slug }
          skill: { summarize: { content: 'test' } },
        });
        expect(mockBrainRepl2.act).toHaveBeenCalled();
      });
    });

    when('[t4] act is called with brain not in allowlist', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          actor.act({
            brain: { repo: 'unknown', slug: 'brain' },
            skill: { summarize: { content: 'test' } },
          }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain('brain not in actor allowlist');
      });
    });
  });

  given('[case3] genActor with single brain', () => {
    const actor = genActor({ role: testRole, brains: [mockBrainRepl1] });

    when('[t0] ask is called', () => {
      then('uses default brain', async () => {
        await actor.ask({ prompt: 'hello', schema: ACTOR_ASK_DEFAULT_SCHEMA });
        expect(mockBrainRepl1.ask).toHaveBeenCalled();
      });
    });
  });

  given('[case4] genActor with Role.typed() for strong typing', () => {
    // create typed role with literal skill names preserved
    const typedRole = Role.typed({
      slug: 'typed-tester',
      name: 'Typed Tester',
      purpose: 'test role with preserved literal types',
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
        dirs: { uri: '.agent/repo=.this/role=typed-tester/skills' },
        refs: [],
      },
      briefs: { dirs: { uri: '.agent/repo=.this/role=typed-tester/briefs' } },
    });

    const typedActor = genActor({
      role: typedRole,
      brains: [mockBrainRepl1],
    });

    when('[t0] act is called with valid rigid skill', () => {
      then('accepts valid skill name and input types', async () => {
        // valid skill: 'summarize' with { content: string }
        await typedActor.act({ skill: { summarize: { content: 'test' } } });
        expect(mockBrainRepl1.act).toHaveBeenCalled();
      });
    });

    when('[t1] act is called with invalid skill name', () => {
      then('produces type error at compile time', () => {
        // type-only assertion: the @ts-expect-error proves that TypeScript
        // would reject this call without the annotation - verifies strong typing
        const _typeCheck = (): void => {
          // @ts-expect-error - 'invalid' is not a valid skill name
          typedActor.act({ skill: { invalid: { content: 'test' } } });
        };
        void _typeCheck; // unused, just for type checking
      });
    });

    when('[t2] act is called with wrong input property', () => {
      then('produces type error for unknown property', () => {
        const _typeCheck = (): void => {
          // @ts-expect-error - 'summarize' expects { content: string }, not { wrong: string }
          typedActor.act({ skill: { summarize: { wrong: 'test' } } });
        };
        void _typeCheck;
      });
    });

    when('[t3] act is called with missing required input', () => {
      then('produces type error for missing content', () => {
        const _typeCheck = (): void => {
          // @ts-expect-error - 'summarize' requires { content: string }, empty object missing required field
          typedActor.act({ skill: { summarize: {} } });
        };
        void _typeCheck;
      });
    });

    when('[t4] act is called with wrong input type', () => {
      then('produces type error for number instead of string', () => {
        const _typeCheck = (): void => {
          // @ts-expect-error - 'content' must be string, not number
          typedActor.act({ skill: { summarize: { content: 123 } } });
        };
        void _typeCheck;
      });
    });

    when('[t5] run is called with valid solid skill', () => {
      then('accepts valid skill name and input types', async () => {
        // valid skill: 'wordcount' with { text: string }
        await typedActor.run({ skill: { wordcount: { text: 'hello world' } } });
        // run delegates to actorRun which calls executeSkill
        // the mock for discoverSkillExecutables should cover this
      });
    });

    when('[t6] run is called with invalid skill name', () => {
      then('produces type error at compile time', () => {
        const _typeCheck = (): void => {
          // @ts-expect-error - 'badskill' is not a valid skill name
          typedActor.run({ skill: { badskill: { text: 'test' } } });
        };
        void _typeCheck;
      });
    });

    when('[t7] run is called with wrong input property', () => {
      then('produces type error for unknown property', () => {
        const _typeCheck = (): void => {
          // @ts-expect-error - 'wordcount' expects { text: string }, not { content: string }
          typedActor.run({ skill: { wordcount: { content: 'wrong' } } });
        };
        void _typeCheck;
      });
    });

    when('[t8] run is called with missing required input', () => {
      then('produces type error for missing text', () => {
        const _typeCheck = (): void => {
          // @ts-expect-error - 'wordcount' requires { text: string }, empty object missing required field
          typedActor.run({ skill: { wordcount: {} } });
        };
        void _typeCheck;
      });
    });

    when('[t9] run is called with wrong input type', () => {
      then('produces type error for number instead of string', () => {
        const _typeCheck = (): void => {
          // @ts-expect-error - 'text' must be string, not number
          typedActor.run({ skill: { wordcount: { text: 999 } } });
        };
        void _typeCheck;
      });
    });
  });

  given('[case5] genActor with BrainAtom as default brain', () => {
    const actor = genActor({
      role: testRole,
      brains: [mockBrainAtom],
    });

    when('[t0] ask is called', () => {
      then('works with BrainAtom', async () => {
        await actor.ask({
          prompt: 'hello from atom',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });
        expect(mockBrainAtom.ask).toHaveBeenCalled();
      });
    });

    when('[t1] act is called', () => {
      then(
        'throws BadRequestError because BrainAtom lacks .act()',
        async () => {
          const error = await getError(() =>
            actor.act({ skill: { summarize: { content: 'test' } } }),
          );
          expect(error).toBeDefined();
          expect(error.message).toContain(
            'actor.act() requires a BrainRepl brain with .act() method',
          );
        },
      );
    });
  });

  given('[case6] genActor with mixed brains (BrainAtom + BrainRepl)', () => {
    const actor = genActor({
      role: testRole,
      brains: [mockBrainAtom, mockBrainRepl1],
    });

    when('[t0] ask is called (uses default = BrainAtom)', () => {
      then('works with BrainAtom', async () => {
        await actor.ask({ prompt: 'hello', schema: ACTOR_ASK_DEFAULT_SCHEMA });
        expect(mockBrainAtom.ask).toHaveBeenCalled();
      });
    });

    when('[t1] act is called without brain (default = BrainAtom)', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          actor.act({ skill: { summarize: { content: 'test' } } }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain(
          'actor.act() requires a BrainRepl brain with .act() method',
        );
      });
    });

    when('[t2] act is called with explicit BrainRepl', () => {
      then('works with BrainRepl from allowlist', async () => {
        await actor.act({
          brain: mockBrainRepl1,
          skill: { summarize: { content: 'test' } },
        });
        expect(mockBrainRepl1.act).toHaveBeenCalled();
      });
    });

    when('[t3] act is called with explicit BrainRepl ref', () => {
      then('works with BrainRepl from allowlist', async () => {
        await actor.act({
          brain: { repo: 'anthropic', slug: 'anthropic/claude' },
          skill: { summarize: { content: 'test' } },
        });
        expect(mockBrainRepl1.act).toHaveBeenCalled();
      });
    });
  });
});
