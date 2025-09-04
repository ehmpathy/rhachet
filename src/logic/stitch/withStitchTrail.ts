import {
  Procedure,
  ProcedureContext,
  ProcedureInput,
  ProcedureOutput,
} from 'as-procedure';
import { withAssure } from 'type-fns';
import { getUuid } from 'uuid-fns';

import { StitchSetEvent } from '../../domain/objects';
import {
  StitchTrail,
  StitchTrailMarker,
} from '../../domain/objects/StitchTrail';
import { isOfStitcherForm, Stitcher } from '../../domain/objects/Stitcher';

export interface ContextStitchTrail {
  stitch: {
    /**
     * the full stitch trail
     */
    trail: StitchTrail;

    /**
     * where to stream stitch set events, if anywhere
     */
    stream?: {
      emit: (input: StitchSetEvent<any, any>) => Promise<void>;
    };
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
        trail: [...(context.stitch.trail ?? []), stitchTrailMarker], // append the trail marker
        stream: context.stitch.stream, // forward the event stream, if provided
      },
    };

    // invoke the logic with this trail marker now added to its context
    return await logic(input, {
      ...context,
      ...stitchTrailContextNow,
    });
  }) as typeof logic;
};
