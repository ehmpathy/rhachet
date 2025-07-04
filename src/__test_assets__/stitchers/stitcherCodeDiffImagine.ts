import { StitchStepImagine } from '../../domain/objects/StitchStep';
import { GStitcher } from '../../domain/objects/Stitcher';
import { Threads } from '../../domain/objects/Threads';
import {
  ContextOpenAI,
  imagineViaOpenAI,
} from '../../logic/stitch/adapters/imagineViaOpenAI';

export const stitcherCodeDiffImagine = new StitchStepImagine<
  GStitcher<
    Threads<{
      artist: { tools: string[]; facts: string[] };
      director: { directive?: string };
    }>,
    ContextOpenAI & GStitcher['context'],
    string
  >
>({
  form: 'IMAGINE',
  slug: '[artist]<code:diff>',
  stitchee: 'artist',
  readme: 'intent(imagines a codediff)',
  enprompt: ({ threads }) =>
    [
      'imagine a codediff to fulfill the directive',
      '',
      'context.tools = ',
      threads.artist.context.tools.join('\n - '),
      '',
      'context.facts = ',
      threads.artist.context.facts.join('\n - '),
      '',
      'here is the current state of the code',
      threads.artist.stitches.slice(-1)[0]?.output.content,
      '',
      'here is the directive',
      threads.director.context.directive ??
        JSON.stringify(threads.director.stitches.slice(-1)[0]?.output),
    ].join('\n'),
  imagine: imagineViaOpenAI,
  deprompt: ({ promptOut, promptIn }) => ({
    output: promptOut,
    input: promptIn,
  }),
});
