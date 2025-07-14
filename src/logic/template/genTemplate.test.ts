import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then } from 'test-fns';
import { Empty } from 'type-fns';

import { Threads } from '../../domain/objects';
import { genThread } from '../thread/genThread';
import { genTemplate } from './genTemplate';

const ref = { uri: __dirname + '/.temp/useTemplate.example1.md' };
const templateArt = genArtifactGitFile(ref);

describe('genTemplate', () => {
  given('a valid template and threads with nested values', () => {
    const threads = {
      person: genThread({
        role: 'person',
        name: 'Casey',
        meta: { day: 'Monday' },
      }),
    };

    when('calling use() on a hydrated template', () => {
      const template = genTemplate<typeof threads>({
        ref,
        getVariables: (input) => ({
          name: input.threads.person.context.name,
          meta: input.threads.person.context.meta,
        }),
      });

      then('it returns the fully hydrated string', async () => {
        await templateArt.set({
          content: 'Hello $.rhachet{name} — today is $.rhachet{meta.day}',
        });

        const result = await template.use({ threads });
        expect(result).toBe('Hello Casey — today is Monday');
      });
    });
  });

  given('a template with deeply nested async variables', () => {
    const threads = {
      session: genThread({
        role: 'session',
        user: { name: 'Jordan', details: { role: 'admin' } },
      }),
    };

    when('calling use() with async getVariables', () => {
      const template = genTemplate({
        ref,
        getVariables: async (input: { threads: typeof threads }) => ({
          user: input.threads.session.context.user,
        }),
      });

      then('it correctly interpolates the nested keys', async () => {
        await templateArt.set({
          content:
            'User: $.rhachet{user.name}, Role: $.rhachet{user.details.role}',
        });

        const result = await template.use({ threads });
        expect(result).toBe('User: Jordan, Role: admin');
      });
    });
  });

  given('a template that references a missing variable', () => {
    const threads = {
      user: genThread({ role: 'user', name: 'Sam' }),
    };

    when('calling use() with missing $.rhachet{missing}', () => {
      const template = genTemplate({
        ref,
        getVariables: (input: { threads: typeof threads }) => ({
          name: input.threads.user.context.name,
        }),
      });

      then('it throws a missing variable error', async () => {
        await templateArt.set({
          content: 'Hello $.rhachet{name} and $.rhachet{missing}',
        });

        await expect(template.use({ threads })).rejects.toThrow(
          'missing variable for $.rhachet{missing} in template',
        );
      });
    });
  });

  given('a non-existent template file', () => {
    const badRef = { uri: __dirname + '/.temp/does-not-exist.md' };

    when('calling use() on a template with a missing file', () => {
      const threads = {
        ghost: genThread({ role: 'ghost' }),
      };

      const template = genTemplate({
        ref: badRef,
        getVariables: () => ({
          hello: 'world',
        }),
      });

      then('it throws a file missing error', async () => {
        await expect(template.use({ threads })).rejects.toThrow(
          'template artifact does not exist',
        );
      });
    });
  });

  given(
    'an invalid getVariables that references a nonexistent thread role',
    () => {
      when('defining the template', () => {
        then('TypeScript throws a compile-time error', () => {
          genTemplate<Threads<{ person: Empty }>>({
            ref,
            getVariables: (input) =>
              // @ts-expect-error - threads.ghost does not exist
              input.threads.ghost.context.name,
          });
        });
      });
    },
  );

  given('an invalid getVariables that returns a non-object', () => {
    when('defining the template', () => {
      then('TypeScript throws a compile-time error', () => {
        genTemplate({
          ref,
          // @ts-expect-error - return must be object-like
          getVariables: () => 'just a string',
        });
      });
    });
  });
});
