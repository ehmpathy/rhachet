import { given, when, then } from 'test-fns';

import {
  GStitcher,
  RoleContext,
  RoleSkill,
  Stitcher,
  Threads,
} from '../../domain/objects';
import { enrollThread } from './enrollThread';
import { genRoleSkill } from './genRoleSkill';

describe('genRoleSkill', () => {
  given('a valid set of lookup, assess, and instantiate handlers', () => {
    const skill = genRoleSkill({
      slug: 'demo',
      readme: 'demo readme',
      route: {} as Stitcher<
        GStitcher<Threads<{ caller: RoleContext<'caller', { foo: string }> }>>
      >,
      threads: {
        lookup: {
          foo: {
            source: 'process.argv',
            desc: 'some arg',
            char: 'f',
            type: 'string',
          },
        },
        assess: (input: any): input is { foo: string } =>
          typeof input.foo === 'string',
        instantiate: async (input: { foo: string }) => {
          return {
            caller: await enrollThread({
              role: 'caller',
              stash: { foo: input.foo },
            }),
          };
        },
      },
      context: {
        lookup: {
          bar: {
            source: 'process.env',
            desc: 'some env var',
            envar: 'DEMO_ENV',
            type: 'string',
          },
        },
        assess: (input: any): input is { bar: string } =>
          typeof input.bar === 'string',
        instantiate: (input: { bar: string }) => {
          return {
            demoCtx: input.bar,
          } as any as GStitcher['context'];
        },
      },
    });

    when('the skill is instantiated', () => {
      then('it should produce a valid RoleSkill object', () => {
        expect(skill).toBeInstanceOf(RoleSkill);
        expect(skill.slug).toBe('demo');
        expect(skill.readme).toContain('demo readme');
      });

      then('its thread assess should validate correct input', () => {
        const valid = { foo: 'hello' };
        const invalid = { foo: 123 };
        expect(skill.threads.assess(valid)).toBe(true);
        expect(skill.threads.assess(invalid)).toBe(false);
      });

      then('its context assess should validate correct input', () => {
        const valid = { bar: 'world' };
        const invalid = { bar: false };
        expect(skill.context.assess(valid)).toBe(true);
        expect(skill.context.assess(invalid)).toBe(false);
      });

      then(
        'its thread instantiation should return the correct output',
        async () => {
          const result = await skill.threads.instantiate({ foo: 'hi' });
          expect(result.caller).toBeDefined();
          expect(result.caller.context.stash.foo).toBe('hi');
        },
      );

      then(
        'its context instantiation should return the correct output',
        async () => {
          const ctx = await skill.context.instantiate({ bar: 'baz' });
          expect(ctx.log);
        },
      );
    });
  });
});
