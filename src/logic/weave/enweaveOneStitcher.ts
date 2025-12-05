import { UnexpectedCodePathError } from 'helpful-errors';
import {
  type GStitcher,
  type Stitcher,
  StitcherForm,
} from '../../domain/objects/Stitcher';
import type { StitchSetEvent } from '../../domain/objects/StitchSetEvent';
import { enstitch } from '../stitch/enstitch';
import { enweaveOneChoice } from './enweaveOneChoice';
import { enweaveOneCycle } from './enweaveOneCycle';
import { enweaveOneFanout } from './enweaveOneFanout';
import { enweaveOneRoute } from './enweaveOneRoute';

/**
 * .what = a mechanism to enweave any stitcher
 * .why =
 *   - figures out which mechanism to call for each stitcher
 */
export const enweaveOneStitcher = async <TStitcher extends GStitcher>(
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

    // support composite stitchers
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
    case StitcherForm.CHOICE:
      return enweaveOneChoice(
        { stitcher: input.stitcher, threads: input.threads },
        context,
      );
    case StitcherForm.CYCLE:
      return enweaveOneCycle(
        { stitcher: input.stitcher, threads: input.threads },
        context,
      );

    // fail fast for todos
    // case StitcherForm.SLEEP:

    // fail fast for typos
    default:
      UnexpectedCodePathError.throw(
        'unsupported stitcher form in enweaveOneStitcher',
        {
          form: input.stitcher.form,
          stitcher: input.stitcher,
        },
      );
  }
};
