import {
  Procedure,
  ProcedureContext,
  ProcedureInput,
  ProcedureOutput,
} from 'as-procedure';

import { StitchTrail } from '../../domain/objects/StitchTrail';

export interface ContextStitchTrail {
  stitch: {
    trail: StitchTrail;
  };
}

/**
 * .what = adds stitch trail to enstitcher
 * .why =
 *   - enables traces of why a stitch was created
 */
export const withStitchTrail = <TLogic extends Procedure>(
  logic: TLogic,
): typeof logic => {
  return (async (
    input: ProcedureInput<typeof logic>,
    context: ProcedureContext<typeof logic>,
  ): Promise<ProcedureOutput<typeof logic>> => {
    return await logic(input, {
      ...context,

      // update the stitch trail context
      stitch: {
        trail: [...(context.stitch.trail ?? []), input.stitcher.slug],
      },
    });
  }) as typeof logic;
};
