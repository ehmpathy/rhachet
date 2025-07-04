import { UnexpectedCodePathError } from 'helpful-errors';

import { StitchSetEvent } from '../../domain/objects/StitchSetEvent';
import {
  GStitcher,
  Stitcher,
  StitcherForm,
} from '../../domain/objects/Stitcher';
import { enstitch } from '../stitch/enstitch';
import { withStitchTrail } from '../stitch/withStitchTrail';
import { enweaveOneFanout } from './enweaveOneFanout';
import { enweaveOneRoute } from './enweaveOneRoute';

/**
 * .what = a mechanism to enweave any stitcher
 * .why =
 *   - figures out which mechanism to call for each stitcher
 */
export const enweaveOneStitcher = withStitchTrail(
  async <TStitcher extends GStitcher>(
    input: {
      stitcher: Stitcher<TStitcher>;
      threads: TStitcher['threads'];
    },
    context: TStitcher['context'],
  ): Promise<StitchSetEvent<TStitcher['threads'], TStitcher['output']>> => {
    switch (input.stitcher.form) {
      // support step stitchers
      case StitcherForm.COMPUTE:
      case StitcherForm.IMAGINE:
        return enstitch(
          { stitcher: input.stitcher, threads: input.threads },
          context,
        );

      // support route stitcher
      case StitcherForm.ROUTE:
        return enweaveOneRoute(
          { stitcher: input.stitcher, threads: input.threads },
          context,
        );

      case StitcherForm.FANOUT:
        return enweaveOneFanout(
          { stitcher: input.stitcher, threads: input.threads },
          context,
        );
      // case StitcherForm.CHOICE:
      // case StitcherForm.CYCLE:
      // case StitcherForm.AWAIT:
      default:
        UnexpectedCodePathError.throw(
          'unsupported stitcher form in enweaveOneStitcher',
          {
            form: input.stitcher.form,
            stitcher: input.stitcher,
          },
        );
    }
  },
);
