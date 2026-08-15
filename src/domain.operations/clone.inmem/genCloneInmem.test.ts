import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainOutput } from '@src/.test.assets/genMockedBrainOutput';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';
import { BrainAtom } from '@src/domain.objects/BrainAtom';
import { BrainRepl } from '@src/domain.objects/BrainRepl';
import { Role } from '@src/domain.objects/Role';
import { ACTOR_ASK_DEFAULT_SCHEMA } from '@src/domain.operations/actor/actorAsk';
import { genActor } from '@src/domain.operations/actor/genActor';

import { genCloneInmem } from './genCloneInmem';

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

describe('genCloneInmem', () => {
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

  // a second role — proves the clone reaches a skill across its role UNION
  const secondRole = new Role({
    slug: 'lifeguard',
    name: 'Lifeguard',
    purpose: 'second role for union tests',
    readme: { uri: '.test/readme.md' },
    traits: [],
    skills: {
      solid: {},
      rigid: {
        'plan.session': {
          input: z.object({ level: z.string() }),
          output: z.object({ plan: z.string() }),
        },
      },
      dirs: { uri: '.agent/repo=.this/role=lifeguard/skills' },
      refs: [],
    },
    briefs: { dirs: { uri: '.agent/repo=.this/role=lifeguard/briefs' } },
  });

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

  // a BrainAtom (no .act() method) — proves .act() fails loud on an atom
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

  // bake a single-role clone from an actor recipe
  const bakeClone = (brains: (BrainRepl | BrainAtom)[]) =>
    genCloneInmem({ actor: genActor({ roles: [testRole], brains }) });

  given('[case1] a clone baked from an actor with valid brains', () => {
    const clone = bakeClone([mockBrainRepl1, mockBrainRepl2]);

    when('[t0] the clone is baked', () => {
      then('carries the actor roles', () => {
        expect(clone.roles[0]).toEqual(testRole);
      });

      then('carries the brains allowlist', () => {
        expect(clone.brains).toHaveLength(2);
        expect(clone.brains[0]).toEqual(mockBrainRepl1);
      });

      then('is engageable — has act/run/ask methods', () => {
        expect(typeof clone.act).toEqual('function');
        expect(typeof clone.run).toEqual('function');
        expect(typeof clone.ask).toEqual('function');
      });
    });

    when('[t1] act is called without a brain', () => {
      then('uses the default brain (first in allowlist)', async () => {
        await clone.act({ skill: { summarize: { content: 'test' } } });
        expect(mockBrainRepl1.act).toHaveBeenCalled();
      });
    });

    when('[t2] act is called with an explicit brain ref', () => {
      then('uses the specified brain from the allowlist', async () => {
        await clone.act({
          brain: { repo: 'openai', slug: 'openai/codex' },
          skill: { summarize: { content: 'test' } },
        });
        expect(mockBrainRepl2.act).toHaveBeenCalled();
      });
    });

    when('[t3] act is called with an explicit brain (direct pass-in)', () => {
      then(
        'uses the passed BrainRepl instance from the allowlist',
        async () => {
          await clone.act({
            brain: mockBrainRepl2,
            skill: { summarize: { content: 'test' } },
          });
          expect(mockBrainRepl2.act).toHaveBeenCalled();
        },
      );
    });

    when('[t4] act is called with a brain not in the allowlist', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          clone.act({
            brain: { repo: 'unknown', slug: 'brain' },
            skill: { summarize: { content: 'test' } },
          }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain('brain not in actor allowlist');
      });
    });
  });

  given('[case2] a clone baked from a single-brain actor', () => {
    const clone = bakeClone([mockBrainRepl1]);

    when('[t0] ask is called', () => {
      then('uses the default brain', async () => {
        await clone.ask({ prompt: 'hello', schema: ACTOR_ASK_DEFAULT_SCHEMA });
        expect(mockBrainRepl1.ask).toHaveBeenCalled();
      });
    });

    when('[t1] run is called with a valid solid skill', () => {
      then('resolves without error', async () => {
        await clone.run({ skill: { wordcount: { text: 'hello world' } } });
        // run delegates to actorRun which calls the mocked executeSkill
      });
    });
  });

  given('[case3] a clone whose default brain is a BrainAtom', () => {
    const clone = bakeClone([mockBrainAtom]);

    when('[t0] ask is called', () => {
      then('works with the BrainAtom', async () => {
        await clone.ask({
          prompt: 'hello from atom',
          schema: ACTOR_ASK_DEFAULT_SCHEMA,
        });
        expect(mockBrainAtom.ask).toHaveBeenCalled();
      });
    });

    when('[t1] act is called', () => {
      then('throws because BrainAtom lacks .act()', async () => {
        const error = await getError(() =>
          clone.act({ skill: { summarize: { content: 'test' } } }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain(
          'clone.act() requires a BrainRepl brain with .act() method',
        );
      });
    });
  });

  given('[case4] a clone with mixed brains (BrainAtom + BrainRepl)', () => {
    const clone = bakeClone([mockBrainAtom, mockBrainRepl1]);

    when('[t0] act is called without a brain (default = BrainAtom)', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          clone.act({ skill: { summarize: { content: 'test' } } }),
        );
        expect(error).toBeDefined();
        expect(error.message).toContain(
          'clone.act() requires a BrainRepl brain with .act() method',
        );
      });
    });

    when('[t1] act is called with an explicit BrainRepl', () => {
      then('works with the BrainRepl from the allowlist', async () => {
        await clone.act({
          brain: mockBrainRepl1,
          skill: { summarize: { content: 'test' } },
        });
        expect(mockBrainRepl1.act).toHaveBeenCalled();
      });
    });
  });

  given('[case5] a clone baked from an actor with MULTIPLE roles', () => {
    // inline (not the single-role helper) so the role UNION type is preserved
    const clone = genCloneInmem({
      actor: genActor({
        roles: [testRole, secondRole],
        brains: [mockBrainRepl1],
      }),
    });

    when('[t0] act is called with a skill from the FIRST role', () => {
      then('reaches the skill and engages the brain', async () => {
        await clone.act({ skill: { summarize: { content: 'test' } } });
        expect(mockBrainRepl1.act).toHaveBeenCalled();
      });
    });

    when('[t1] act is called with a skill from the SECOND role', () => {
      then('reaches the skill across the role union', async () => {
        await clone.act({ skill: { 'plan.session': { level: 'beginner' } } });
        expect(mockBrainRepl1.act).toHaveBeenCalled();
      });
    });
  });
});
