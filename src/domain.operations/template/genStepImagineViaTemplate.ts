import { type GStitcher, StitchStepImagine } from '@src/domain.objects';
import type { Template } from '@src/domain.objects/Template';

/**
 * .what = creates a typed StitchStepImagine from a prompt template and AI imagine function
 * .why = enables reusable, type-safe imagine steps with minimal boilerplate
 */
export const genStepImagineViaTemplate = <
  TStitcher extends GStitcher<any, any, any>,
>(input: {
  slug: string;
  readme: string;
  stitchee: keyof TStitcher['threads'];
  template: Template<{ threads: TStitcher['threads'] }>;
  imagine: (prompt: string, context: TStitcher['context']) => Promise<string>;
  deprompt?: (args: { input: string; output: string }) => {
    output: TStitcher['output'];
    input: any;
  };
}): StitchStepImagine<TStitcher> =>
  new StitchStepImagine<TStitcher>({
    form: 'IMAGINE',
    slug: input.slug,
    readme: input.readme,
    stitchee: input.stitchee as string,
    enprompt: async ({ threads }) => input.template.use({ threads }),
    imagine: input.imagine,
    deprompt: ({ promptIn, promptOut }) =>
      input.deprompt?.({ input: promptIn, output: promptOut }) ?? {
        input: { prompt: promptIn },
        output: { content: promptOut } as TStitcher['output'],
      },
  });
