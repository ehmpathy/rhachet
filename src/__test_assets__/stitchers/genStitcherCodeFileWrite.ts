/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { UnexpectedCodePathError } from 'helpful-errors';

import { Stitch } from '../../domain/objects/Stitch';
import { StitchStepCompute } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Threads } from '../../domain/objects/Threads';
import { ContextOpenAI } from '../../logic/stitch/adapters/imagineViaOpenAI';

export type OutputFileWrite = {
  path: string;
  content: string;
};

/**
 * .what = generates a mock file write stitcher
 * .why = finalizes a codediff into a file output result
 */
export const genStitcherCodeFileWrite = <
  TStitchee extends keyof TThreads,
  TThreads extends Threads<any> = Threads,
>(input: {
  stitchee: TStitchee;
  path?: string;
}) =>
  new StitchStepCompute<
    GStitcher<TThreads, ContextOpenAI & GStitcher['context'], OutputFileWrite>
  >({
    form: 'COMPUTE',
    slug: '[any]<code:file.write>',
    readme: 'mock file writer that copies the output string into file output',
    stitchee: input.stitchee,
    invoke: ({ threads }) => {
      const latest = threads[input.stitchee]?.stitches.slice(-1)[0];
      const content = latest?.output;
      if (typeof content !== 'string')
        throw new UnexpectedCodePathError(
          'Expected previous stitch output to be a string-codediff',
          { latest, threads },
        );

      const result: OutputFileWrite = {
        path: input.path ?? '__mock__/rewritten.ts',
        content,
      };

      return { input: result, output: result };
    },
  });
