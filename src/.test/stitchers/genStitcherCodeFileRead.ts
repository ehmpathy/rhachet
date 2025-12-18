/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { isAFunction } from 'type-fns';

import { StitchStepCompute } from '@src/domain.objects/StitchStep';
import { GStitcher } from '@src/domain.objects/Stitcher';
import { Threads } from '@src/domain.objects/Threads';
import { ContextOpenAI } from '@src/domain.operations/stitch/adapters/imagineViaOpenAI';

export type OutputFileRead = {
  path: string;
  content: string;
};

export const genStitcherCodeFileRead = <
  TStitchee extends keyof TThreads,
  TThreads extends Threads = Threads,
>(input: {
  stitchee: TStitchee;
  output: OutputFileRead | ((input: { threads: TThreads }) => OutputFileRead);
}) =>
  new StitchStepCompute<
    GStitcher<TThreads, ContextOpenAI & GStitcher['context'], OutputFileRead>
  >({
    form: 'COMPUTE',
    readme: null,
    slug: '[any]<code:file.read>',
    stitchee: input.stitchee,
    invoke: ({ threads }) => {
      const output = isAFunction(input.output)
        ? input.output({ threads })
        : input.output;
      return {
        input: { path: output.path },
        output,
      };
    },
  });
