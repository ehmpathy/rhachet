import { UnexpectedCodePathError } from 'helpful-errors';

import { Stitch } from '../../domain/objects/Stitch';
import { GStitcher, Stitcher } from '../../domain/objects/Stitcher';
import { invokeImagineStitcher } from './invokeImagineStitcher';

export const enstitch = <TStitcher extends GStitcher>(
  input: {
    stitcher: Stitcher<TStitcher>;
    threads: TStitcher['threads'];
  },
  context: TStitcher['procedure']['context'],
): Promise<Stitch<TStitcher['output']>> => {
  // if the stitcher is of type "compute", then execute the computation; // todo: add observability on duration
  if (input.stitcher.form === 'COMPUTE')
    return input.stitcher.invoke({ threads: input.threads }, context);

  // if the stitcher is of type "imagine", then execute the imagination // todo: add observability
  if (input.stitcher.form === 'IMAGINE')
    return invokeImagineStitcher(
      { stitcher: input.stitcher, threads: input.threads },
      context,
    );

  // otherwise, unsupported and unexpected; should have been compiletime prevented
  throw new UnexpectedCodePathError(
    'why did we get an unsupported stitcher.form?',
    { stitcher: input.stitcher },
  );
};
