import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genSampleBrainSpec } from '@src/.test.assets/genSampleBrainSpec';

import { ActorInmem } from './ActorInmem';
import type { BrainRepl } from './BrainRepl';
import { Role } from './Role';

describe('ActorInmem', () => {
  // create a typed role — Role.typed() keeps the skill literals intact
  const testRole = Role.typed({
    slug: 'tester',
    name: 'Tester',
    purpose: 'test role for actor tests',
    readme: { uri: '.test/readme.md' },
    traits: [],
    skills: {
      solid: {
        greet: {
          input: z.object({ name: z.string() }),
          output: z.object({ salutation: z.string() }),
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
    ask: jest.fn(),
    act: jest.fn(),
  };

  given('[case1] an in-mem actor (recipe)', () => {
    when('[t0] constructed with a role list and brains', () => {
      const actor = ActorInmem.typed({
        roles: [testRole],
        brains: [testBrain],
      });

      then('roles is accessible as a list', () => {
        expect(actor.roles).toHaveLength(1);
        expect(actor.roles[0]).toEqual(testRole);
        expect(actor.roles[0]!.slug).toEqual('tester');
      });

      then('brains array is accessible', () => {
        expect(actor.brains).toHaveLength(1);
        expect(actor.brains[0]).toEqual(testBrain);
      });

      then('the actor is NOT engageable — no act/run/ask methods', () => {
        // the recipe carries no engage methods; those live on the baked clone
        const bag = actor as unknown as Record<string, unknown>;
        expect(bag.act).toBeUndefined();
        expect(bag.run).toBeUndefined();
        expect(bag.ask).toBeUndefined();
      });
    });

    when('[t1] composed with multiple roles', () => {
      const lifeguardRole = Role.typed({
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

      const actor = ActorInmem.typed({
        roles: [testRole, lifeguardRole],
        brains: [testBrain],
      });

      then('all composed roles are retained in order', () => {
        expect(actor.roles).toHaveLength(2);
        expect(actor.roles.map((role) => role.slug)).toEqual([
          'tester',
          'lifeguard',
        ]);
      });
    });
  });
});
