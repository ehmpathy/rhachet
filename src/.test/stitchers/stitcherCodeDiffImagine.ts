import { UnexpectedCodePathError } from 'helpful-errors';

import { StitchStepImagine } from '@src/domain.objects/StitchStep';
import { GStitcher } from '@src/domain.objects/Stitcher';
import { Threads } from '@src/domain.objects/Threads';
import {
  ContextOpenAI,
  imagineViaOpenAI,
} from '@src/domain.operations/stitch/adapters/imagineViaOpenAI';

/**
 * .what = the code the prior artist stitch holds: a file read yields the text, a file write
 *   yields `{ path, content }`
 * .why = a prompt with no code makes the brain ask for it rather than diff it, so an absent
 *   code fails fast here instead of a flaky verdict downstream
 */
const asCodeFromStitchOutput = (input: { output: unknown }): string => {
  if (typeof input.output === 'string' && input.output.length > 0)
    return input.output;
  const content = (input.output as { content?: unknown } | null | undefined)
    ?.content;
  if (typeof content === 'string' && content.length > 0) return content;
  return UnexpectedCodePathError.throw(
    'expected the prior artist stitch to hold the code to diff',
    { output: input.output },
  );
};

/**
 * .what = the directive the director holds: its context, else its latest stitch output
 * .why = a prompt with no directive leaves the brain to guess the ask, so an absent
 *   directive fails fast here
 */
const asDirectiveFromThread = (input: {
  thread: {
    context: { directive?: string };
    stitches: { output: unknown }[];
  };
}): string => {
  if (input.thread.context.directive) return input.thread.context.directive;
  const outputLatest = input.thread.stitches.slice(-1)[0]?.output;
  if (outputLatest !== undefined) return JSON.stringify(outputLatest);
  return UnexpectedCodePathError.throw(
    'expected the director thread to hold a directive',
    { context: input.thread.context },
  );
};

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
      asCodeFromStitchOutput({
        output: threads.artist.stitches.slice(-1)[0]?.output,
      }),
      '',
      'here is the directive',
      asDirectiveFromThread({ thread: threads.director }),
    ].join('\n'),
  imagine: imagineViaOpenAI,
  deprompt: ({ promptOut, promptIn }) => ({
    output: promptOut,
    input: promptIn,
  }),
});
