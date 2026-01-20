import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainOutputMetrics } from '@src/.test.assets/genMockedBrainOutputMetrics';
import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';

import { Actor } from './Actor';
import { BrainOutput } from './BrainOutput';
import type { BrainRepl } from './BrainRepl';
import { Role } from './Role';

describe('Actor', () => {
  given('[case1] Actor class', () => {
    when('[t0] unique key is checked', () => {
      then('role.slug is the unique key', () => {
        expect(Actor.unique).toEqual(['role.slug']);
      });
    });
  });

  given('[case2] Actor instance', () => {
    // create typed role preserving skill literals via Role.typed()
    const testRole = Role.typed({
      slug: 'tester',
      name: 'Tester',
      purpose: 'test role for actor tests',
      readme: { uri: '.test/readme.md' }, // 'a role for testing Actor type safety',
      traits: [],
      skills: {
        solid: {
          greet: {
            input: z.object({ name: z.string() }),
            output: z.object({ greeting: z.string() }),
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

    // create mock brain with proper structure
    const testBrain: BrainRepl = {
      repo: 'test',
      slug: 'test-brain',
      description: 'test brain',
      spec: genSampleBrainSpec(),
      ask: jest.fn().mockResolvedValue(
        new BrainOutput({
          output: { response: 'response' },
          metrics: genMockedBrainOutputMetrics(),
        }),
      ),
      act: jest.fn().mockResolvedValue(
        new BrainOutput({
          output: { result: 'done' },
          metrics: genMockedBrainOutputMetrics(),
        }),
      ),
    };

    when('[t0] constructed with role and brains', () => {
      const actor = new Actor({
        role: testRole,
        brains: [testBrain],
        act: jest.fn(),
        run: jest.fn(),
        ask: jest.fn(),
      });

      then('role is accessible', () => {
        expect(actor.role).toEqual(testRole);
        expect(actor.role.slug).toEqual('tester');
      });

      then('brains array is accessible', () => {
        expect(actor.brains).toHaveLength(1);
        expect(actor.brains[0]).toEqual(testBrain);
      });

      then('act method is accessible', () => {
        expect(actor.act).toBeDefined();
        expect(typeof actor.act).toEqual('function');
      });

      then('run method is accessible', () => {
        expect(actor.run).toBeDefined();
        expect(typeof actor.run).toEqual('function');
      });

      then('ask method is accessible', () => {
        expect(actor.ask).toBeDefined();
        expect(typeof actor.ask).toEqual('function');
      });
    });
  });

  given('[case3] type-safe skill invocation (vision contract)', () => {
    // create typed role with literal skill names
    const mechanicRole = Role.typed({
      slug: 'mechanic',
      name: 'Mechanic',
      purpose: 'test role for type inference',
      readme: { uri: '.test/readme.md' }, // 'a role for testing Actor type safety',
      traits: [],
      skills: {
        solid: {
          'gh.workflow.logs': {
            input: z.object({ workflow: z.string() }),
            output: z.object({ logs: z.string() }),
          },
        },
        rigid: {
          review: {
            input: z.object({
              input: z.string(),
              rules: z.array(z.string()).optional(),
            }),
            output: z.object({
              decision: z.enum(['approve', 'reject', 'request-changes']),
            }),
          },
          deliver: {
            input: z.object({ input: z.string() }),
            output: z.object({ pr: z.string() }),
          },
        },
        dirs: { uri: '.agent/repo=.this/role=mechanic/skills' },
        refs: [],
      },
      briefs: { dirs: { uri: '.agent/repo=.this/role=mechanic/briefs' } },
    });

    // create mock actor with typed role
    const mockActor: Actor<typeof mechanicRole> = {
      role: mechanicRole,
      brains: [],
      act: jest.fn().mockResolvedValue(
        new BrainOutput({
          output: { decision: 'approve' },
          metrics: genMockedBrainOutputMetrics(),
        }),
      ),
      run: jest.fn().mockResolvedValue({ logs: 'test logs' }),
      ask: jest.fn().mockResolvedValue(
        new BrainOutput({
          output: { response: 'test' },
          metrics: genMockedBrainOutputMetrics(),
        }),
      ),
    };

    when('[t0] .act() with valid rigid skill', () => {
      then('skill "review" compiles with correct input', () => {
        // valid: 'review' is registered in role.skills.rigid
        void mockActor.act({
          skill: { review: { input: 'https://github.com/org/repo/pull/123' } },
        });
        expect(true).toBe(true);
      });

      then('skill "deliver" compiles with correct input', () => {
        // valid: 'deliver' is registered in role.skills.rigid
        void mockActor.act({
          skill: {
            deliver: { input: 'https://github.com/org/repo/issues/456' },
          },
        });
        expect(true).toBe(true);
      });

      then('skill "review" with optional rules compiles', () => {
        // valid: rules is optional in review schema
        void mockActor.act({
          skill: {
            review: {
              input: 'https://github.com/org/repo/pull/123',
              rules: ['@role/briefs/practices/**/*'],
            },
          },
        });
        expect(true).toBe(true);
      });
    });

    when('[t1] .act() with invalid rigid skill', () => {
      then('unknown skill fails at compile time', () => {
        // @ts-expect-error - 'unknown' is not registered in role.skills.rigid
        void mockActor.act({ skill: { unknown: { input: '...' } } });
        expect(true).toBe(true);
      });

      then('wrong input args fail at compile time', () => {
        // @ts-expect-error - 'wrongArg' is not in review's input schema
        void mockActor.act({ skill: { review: { wrongArg: '...' } } });
        expect(true).toBe(true);
      });

      then('missing required input fails at compile time', () => {
        // @ts-expect-error - 'input' is required in review schema
        void mockActor.act({ skill: { review: {} } });
        expect(true).toBe(true);
      });
    });

    when('[t2] .run() with valid solid skill', () => {
      then('skill "gh.workflow.logs" compiles with correct input', () => {
        // valid: 'gh.workflow.logs' is registered in role.skills.solid
        void mockActor.run({
          skill: { 'gh.workflow.logs': { workflow: 'test' } },
        });
        expect(true).toBe(true);
      });
    });

    when('[t3] .run() with invalid solid skill', () => {
      then('unknown solid skill fails at compile time', () => {
        // @ts-expect-error - 'unknown' is not registered in role.skills.solid
        void mockActor.run({ skill: { unknown: {} } });
        expect(true).toBe(true);
      });

      then('rigid skill on .run() fails at compile time', () => {
        // @ts-expect-error - 'review' is in rigid, not solid
        void mockActor.run({ skill: { review: { input: '...' } } });
        expect(true).toBe(true);
      });

      then('wrong input args for solid skill fail at compile time', () => {
        void mockActor.run({
          // @ts-expect-error - 'wrongArg' is not in gh.workflow.logs input schema
          skill: { 'gh.workflow.logs': { wrongArg: '...' } },
        });
        expect(true).toBe(true);
      });
    });

    when('[t4] .act() with brain selection', () => {
      then('brain ref lookup compiles', () => {
        // valid: brain lookup by ref
        void mockActor.act({
          brain: { repo: 'anthropic', slug: 'claude/sonnet' },
          skill: { review: { input: '...' } },
        });
        expect(true).toBe(true);
      });
    });
  });
});
