import { given, when, then } from 'test-fns';
import { Empty } from 'type-fns';

import { genContextLogTrail } from '../../__test_assets__/genContextLogTrail';
import { genContextStitchTrail } from '../../__test_assets__/genContextStitchTrail';
import { GStitcher, Threads } from '../../domain/objects';
import { genThread } from '../thread/genThread';
import { genStepImagineViaTemplate } from './genStepImagineViaTemplate';
import { genTemplate } from './genTemplate';
import { useTemplate } from './useTemplate';

jest.mock('./useTemplate', () => ({
  useTemplate: jest.fn(),
}));

describe('genStepImagineViaTemplate', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
  };

  given('a prompt template and imagine step with incompatible threads', () => {
    const threads = {
      assistant: genThread({ role: 'assistant' as const, name: 'Bert' }),
    };

    const template = genTemplate({
      ref: { uri: 'path/to/template.md' },
      getVariables: (input: { threads: typeof threads }) => ({
        name: input.threads.assistant.context.name,
      }),
    });
    then('there should be a devtime error on instantiation', async () => {
      genStepImagineViaTemplate<GStitcher<Threads<{ assistant: Empty }>>>({
        slug: 'test-slug',
        readme: 'testing imagine via template',
        stitchee: 'assistant',
        // @ts-expect-error:  Property 'name' is missing in type 'ThreadContextRole<"assistant">' but required in type '{ role: "assistant"; name: string; }'.ts(2322)
        template,
        imagine: async (prompt) => `AI said: ${prompt}`,
        deprompt: ({ input, output }) => ({
          input: { prompt: input },
          output: { content: output },
        }),
      });
    });
  });

  given('a prompt template and imagine step with compatible threads', () => {
    const threads = {
      assistant: genThread({ role: 'assistant' as const, name: 'Casey' }),
    };

    const template = genTemplate({
      ref: { uri: 'path/to/template.md' },
      getVariables: (input: { threads: typeof threads }) => ({
        name: input.threads.assistant.context.name,
      }),
    });

    when('creating a StitchStepImagine', () => {
      (useTemplate as jest.Mock).mockImplementation(async (input) => {
        console.log({ input });
        const vars = await input.variables;
        return `hydrated: ${vars.name}`;
      });

      const imagineStep = genStepImagineViaTemplate<GStitcher<typeof threads>>({
        slug: 'test-slug',
        readme: 'testing imagine via template',
        stitchee: 'assistant',
        template,
        imagine: async (prompt) => `AI said: ${prompt}`,
        deprompt: ({ input, output }) => ({
          input: { prompt: input },
          output: { content: output },
        }),
      });

      then('it defines a valid imagine step', async () => {
        expect(imagineStep.form).toBe('IMAGINE');
        expect(imagineStep.slug).toBe('test-slug');
        expect(imagineStep.stitchee).toBe('assistant');
      });

      then('it renders the prompt using useTemplate()', async () => {
        const prompt = await imagineStep.enprompt({ threads });
        expect(prompt).toBe('hydrated: Casey');
        expect(useTemplate).toHaveBeenCalledWith({
          ref: { uri: 'path/to/template.md' },
          variables: { name: 'Casey' },
        });
      });

      then('it runs the imagine function with the prompt', async () => {
        const result = await imagineStep.imagine('a prompt', context);
        expect(result).toBe('AI said: a prompt');
      });

      then('it transforms the output with deprompt', () => {
        const deprompted = imagineStep.deprompt({
          threads,
          promptIn: 'abc',
          promptOut: 'xyz',
        });
        expect(deprompted).toEqual({
          input: { prompt: 'abc' },
          output: { content: 'xyz' },
        });
      });
    });

    when('passing an invalid stitchee', () => {
      then('TypeScript throws an error', () => {
        genStepImagineViaTemplate<GStitcher<typeof threads>>({
          slug: 'invalid',
          readme: 'should fail',
          // @ts-expect-error 'ghost' is not a valid stitchee
          stitchee: 'ghost',
          template,
          imagine: async (prompt) => `ghost: ${prompt}`,
        });
      });
    });

    when('passing a non-literal stitchee key', () => {
      const stitchee = 'assistant' as string;

      then('TypeScript throws an error', () => {
        genStepImagineViaTemplate<GStitcher<typeof threads>>({
          slug: 'bad-key',
          readme: 'non-literal stitchee',
          // @ts-expect-error stitchee must be a literal keyof threads
          stitchee,
          template,
          imagine: async () => `result`,
        });
      });
    });
  });
});
