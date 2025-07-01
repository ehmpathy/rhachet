import { asProcedure } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import { VisualogicContext } from 'visualogic';

import { Stitcher } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';
import { invokeImagineStitcher } from './invokeImagineStitcher';

export const enstitch = <TThreadContext, TProcedureContext>(
  input: {
    stitcher: Stitcher<TThreadContext, TProcedureContext>;
    thread: Thread<TThreadContext>;
  },
  context: TProcedureContext,
) => {
  // if the stitcher is of type "compute", then execute the computation; // todo: add observability on duration
  if (input.stitcher.form === 'COMPUTE')
    return input.stitcher.invoke({ thread: input.thread }, context);

  // if the stitcher is of type "imagine", then execute the imagination // todo: add observability
  if (input.stitcher.form === 'IMAGINE')
    return invokeImagineStitcher(
      { stitcher: input.stitcher, thread: input.thread },
      context,
    );

  // otherwise, unsupported and unexpected; should have been compiletime prevented
  throw new UnexpectedCodePathError(
    'why did we get an unsupported stitcher.form?',
    { stitcher: input.stitcher },
  );
};
