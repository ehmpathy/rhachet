import { StitchChoice } from '../../../domain/objects/StitchChoice';
import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';
import { Threads } from '../../../domain/objects/Threads';
import { GStitcherInferredFromChoice } from './GStitcherInferredFromChoice.generic';

/**
 * .what = generates a stitcher that forks to multiple options and chooses one
 * .why =
 *   - supports runtime conditional logic with decider selection
 * .note =
 *   - decider must return { choice: { slug } }
 *   - options must be typed as const
 */
export const genStitchChoice = <
  TOptions extends readonly [
    Stitcher<GStitcher<Threads<any, 'single'>, any, any>>,
    ...Stitcher<GStitcher<Threads<any, 'single'>, any, any>>[],
  ],
  TDecider extends Stitcher<
    GStitcher<Threads<any, 'single'>, any, { choice: { slug: string } }>
  >,
>(input: {
  slug: string;
  readme: string | null;
  decider: TDecider;
  options: TOptions;
}): StitchChoice<GStitcherInferredFromChoice<TOptions, TDecider>> => {
  return new StitchChoice({
    form: 'CHOICE',
    slug: input.slug,
    readme: input.readme,
    decider: input.decider as any,
    options: input.options as any,
  });
};
