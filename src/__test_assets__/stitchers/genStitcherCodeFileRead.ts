/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Stitch } from '../../domain/objects/Stitch';
import { StitchStepCompute } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Threads } from '../../domain/objects/Threads';
import { ContextOpenAI } from '../../logic/stitch/adapters/imagineViaOpenAI';

export type OutputFileRead = {
  path: string;
  content: string;
};

export const genStitcherCodeFileRead = <
  TStitchee extends keyof TThreads,
  TThreads extends Threads = Threads,
>(input: {
  stitchee: TStitchee;
  output: OutputFileRead;
}) =>
  new StitchStepCompute<
    GStitcher<TThreads, ContextOpenAI & GStitcher['context'], OutputFileRead>
  >({
    form: 'COMPUTE',
    readme: null,
    slug: 'code.file.read',
    stitchee: input.stitchee,
    invoke: () => {
      return new Stitch<OutputFileRead>({
        input: { path: input.output.path },
        output: input.output,
      });
    },
  });
