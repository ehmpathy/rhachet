import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { given, when, then, getError } from 'test-fns';

import { Threads } from '../../domain/objects';
import { RoleSkillThreadsGetter } from '../../domain/objects/RoleSkillArgGetter';
import { genThread } from '../thread/genThread';
import { getSkillThreads } from './getSkillThreads';

const getterExample = RoleSkillThreadsGetter.build<
  RoleSkillThreadsGetter<
    Threads<{ caller: { target: string } }>,
    { target: string; ask: string }
  >
>({
  lookup: {
    target: {
      source: 'process.argv',
      desc: 'target file or dir',
      char: 't',
      type: 'string',
    },
  },
  assess: (input: any): input is { target: string; ask: string } =>
    typeof input?.target === 'string' && typeof input?.ask === 'string',
  instantiate: (input) => ({
    caller: genThread({ role: 'caller', target: input.target }),
  }),
});

describe('getSkillThreads', () => {
  given('a valid threads getter for { target, ask }', () => {
    const getter = getterExample.clone();

    when(
      'called with passin: { target: "src/index.ts", ask: "describe" }',
      () => {
        then('it should return the expected caller thread', async () => {
          const result = await getSkillThreads({
            getter,
            from: { passin: { target: 'src/index.ts', ask: 'describe' } },
          });
          expect(result).toEqual({
            caller: genThread({ role: 'caller', target: 'src/index.ts' }),
          });
        });
      },
    );

    when('called with passin: { bad: true }', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(() =>
          getSkillThreads({
            getter,
            from: { passin: { bad: true } as any },
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });

    when('called with argv: { target: "src/main.ts", ask: "go now" }', () => {
      then('it should return the expected caller thread', async () => {
        const result = await getSkillThreads({
          getter,
          from: { lookup: { argv: { target: 'src/main.ts', ask: 'go now' } } },
        });
        expect(result).toEqual({
          caller: genThread({ role: 'caller', target: 'src/main.ts' }),
        });
      });
    });

    when('called with argv: { t: "src/main.ts", ask: "run this" }', () => {
      then('it should return the expected caller thread', async () => {
        const result = await getSkillThreads({
          getter,
          from: { lookup: { argv: { t: 'src/main.ts', ask: 'run this' } } },
        });
        expect(result).toEqual({
          caller: genThread({ role: 'caller', target: 'src/main.ts' }),
        });
      });
    });

    when('called with argv: { ask: "missing target" }', () => {
      then('it should throw BadRequestError for missing target', async () => {
        const error = await getError(() =>
          getSkillThreads({
            getter,
            from: { lookup: { argv: { ask: 'missing target' } } },
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });

    when('called with argv: { target: "src/x.ts" } (missing ask)', () => {
      then('it should throw BadRequestError for missing ask', async () => {
        const error = await getError(() =>
          getSkillThreads({
            getter,
            from: { lookup: { argv: { target: 'src/x.ts' } as any } },
          }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toMatch(/missing.*ask/i);
      });
    });
  });

  given('a rejecting getter that fails all assess checks', () => {
    const getter = getterExample.clone({
      assess: (() => false) as any,
    });

    when(
      'called with argv: { target: "src/any.ts", ask: "still fails" }',
      () => {
        then('it should throw UnexpectedCodePathError', async () => {
          const error = await getError(() =>
            getSkillThreads({
              getter,
              from: {
                lookup: {
                  argv: { target: 'src/any.ts', ask: 'still fails' },
                },
              },
            }),
          );
          expect(error).toBeInstanceOf(UnexpectedCodePathError);
        });
      },
    );

    when(
      'called with passin: { target: "src/any.ts", ask: "bad input" }',
      () => {
        then('it should throw BadRequestError', async () => {
          const error = await getError(() =>
            getSkillThreads({
              getter,
              from: { passin: { target: 'src/any.ts', ask: 'bad input' } },
            }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
        });
      },
    );
  });
});
