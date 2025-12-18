import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { type GStitcher, RoleSkillContextGetter } from '@src/domain.objects';

import { getSkillContext } from './getSkillContext';

const getterExample = RoleSkillContextGetter.build<
  RoleSkillContextGetter<
    { key: string } & GStitcher['context'],
    { openaiApiKey: string }
  >
>({
  lookup: {
    openaiApiKey: {
      source: 'process.env',
      desc: 'your OpenAI key',
      envar: 'OPENAI_API_KEY',
      type: 'string',
    },
  },
  assess: (input: any): input is { openaiApiKey: string } =>
    typeof input?.openaiApiKey === 'string',
  instantiate: (input) =>
    ({
      key: input.openaiApiKey,
    }) as any,
});

describe('getSkillContext', () => {
  given('a valid context getter requiring OPENAI_API_KEY', () => {
    const getter = getterExample.clone();

    when('called with passin: { openaiApiKey: "sk-abc" }', () => {
      then('it should return the expected context', async () => {
        const result = await getSkillContext({
          getter,
          from: { passin: { openaiApiKey: 'sk-abc' } },
        });

        expect(result).toEqual({ key: 'sk-abc' });
      });
    });

    when('called with passin: { wrongKey: "oops" }', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(async () =>
          getSkillContext({
            getter,
            from: { passin: { wrongKey: 'oops' } as any },
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
      });
    });

    when('called with env: { OPENAI_API_KEY: "sk-env" }', () => {
      then('it should return the expected context', async () => {
        const result = await getSkillContext({
          getter,
          from: { lookup: { env: { OPENAI_API_KEY: 'sk-env' } } },
        });

        expect(result).toEqual({ key: 'sk-env' });
      });
    });

    when('called with env: {} (missing key)', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(async () =>
          getSkillContext({
            getter,
            from: { lookup: { env: {} } },
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });

  given('a rejecting getter that fails all assess checks', () => {
    const getter = getterExample.clone({
      assess: (() => false) as any,
    });

    when('called with env: { OPENAI_API_KEY: "sk-reject" }', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const error = await getError(async () =>
          getSkillContext({
            getter,
            from: { lookup: { env: { OPENAI_API_KEY: 'sk-reject' } } },
          }),
        );

        expect(error).toBeInstanceOf(UnexpectedCodePathError);
      });
    });

    when('called with passin: { openaiApiKey: "sk-reject" }', () => {
      then('it should throw BadRequestError', async () => {
        const error = await getError(async () =>
          getSkillContext({
            getter,
            from: { passin: { openaiApiKey: 'sk-reject' } },
          }),
        );

        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });
});
