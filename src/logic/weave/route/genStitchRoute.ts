import { StitchRoute } from '../../../domain/objects/StitchRoute';
import { GStitcher, Stitcher } from '../../../domain/objects/Stitcher';

type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

/**
 * .what = a mech to infer a GStitcher from a StitchRoute.Sequence
 */
type GStitcherInferred<TSequence extends Stitcher<GStitcher<any, any, any>>[]> =
  GStitcher<
    First<TSequence> extends Stitcher<infer G> ? G['threads'] : never,
    First<TSequence> extends Stitcher<infer G>
      ? G['procedure']['context']
      : never,
    Last<TSequence> extends Stitcher<infer G> ? G['output'] : never
  >;

export const genStitchRoute = <
  TSequence extends [
    Stitcher<GStitcher<any, any, any>>,
    ...Stitcher<GStitcher<any, any, any>>[],
  ],
>(input: {
  slug: string;
  name: string;
  description: string | null;
  sequence: TSequence;
}): StitchRoute<GStitcherInferred<TSequence>> => {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    sequence: input.sequence as any,
  };
};
