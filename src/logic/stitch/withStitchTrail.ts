import {
  Procedure,
  ProcedureContext,
  ProcedureInput,
  ProcedureOutput,
} from 'as-procedure';
import { withAssure } from 'type-fns';
import { getUuid } from 'uuid-fns';

import {
  StitchTrail,
  StitchTrailMarker,
} from '../../domain/objects/StitchTrail';
import { isOfStitcherForm, Stitcher } from '../../domain/objects/Stitcher';

export interface ContextStitchTrail {
  stitch: {
    trail: StitchTrail;
  };
}

export const isStitcher = withAssure(
  (input: any): input is Stitcher =>
    !!input &&
    'form' in input &&
    'slug' in input &&
    isOfStitcherForm(input.form),
);

/**
 * .what = adds stitch trail to enstitcher
 * .why =
 *   - enables traces of why a stitch was created
 *   - enables you to see the different trails taken across the domain's treestruct of questions
 */
export const withStitchTrail = <TLogic extends Procedure>(
  logic: TLogic, // todo: assure that it extends input { stitcher }
): typeof logic => {
  return (async (
    input: ProcedureInput<typeof logic>,
    context: ProcedureContext<typeof logic>,
  ): Promise<ProcedureOutput<typeof logic>> => {
    // assure that stitcher was part of the input, if withStitchTrail was used
    const stitcher = isStitcher.assure(input.stitcher);

    // establish a new trail marker and add it to the context
    const stitchTrailMarker = StitchTrailMarker.build({
      stitcherSlug: stitcher.slug,
      stitchUuid: getUuid(), // new stitcher invocation -> new trail marker
    });
    const stitchTrailContextNow: ContextStitchTrail = {
      stitch: {
        trail: [...(context.stitch.trail ?? []), stitchTrailMarker],
      },
    };

    // invoke the logic with this trail marker now added to its context
    return await logic(input, {
      ...context,
      ...stitchTrailContextNow,
    });
  }) as typeof logic;
};
