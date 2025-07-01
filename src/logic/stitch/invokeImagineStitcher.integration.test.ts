import { given, then, when } from 'test-fns';

import { getContextOpenAI } from '../../__test_assets__/getContextOpenAI';
import { Stitch } from '../../domain/objects/Stitch';
import { StitcherImagine } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';
import { imagineViaOpenAI } from './adapters/imagineViaOpenAI';
import { enstitch } from './enstitch';

describe('invokeImagineStitcher', () => {
  const context = { log: console, ...getContextOpenAI() };

  given('a representative imagine stitcher', () => {
    const stitcher = new StitcherImagine({
      form: 'IMAGINE',
      slug: 'fillout-stub',
      readme:
        'intent(fills out a stub of code); note(good example for impact of context)',
      enprompt: ({ thread }: { thread: Thread<{ factset: string[] }> }) =>
        [
          'fillout the code of the given stubout',
          'context.factset = ',
          thread.context.factset.join('\n - '),
          '',
          'here is the stubout',
          thread.stitches.slice(-1)[0],
          '',
          'fillout the code of the given stubout',
        ].join('\n'),
      imagine: imagineViaOpenAI,
      deprompt: ({ prompt }) => new Stitch({ output: prompt }),
    });

    const stubout = `
/**
 * .what = calls the open-meteo weather api
 * .how =
 *   - uses axios.get() procedural pattern
 *   - fails fast
 */
export const sdkOpenMeteo = {
  getWeather: (input: {...}, context: VisualogicContext & AuthContextOpenMeteo) => {
    ...
  }
}
    `.trim();

    when('thread has blank context', () => {
      const thread = new Thread({
        context: { factset: [] },
        stitches: [{ output: stubout }],
      });

      then('it should be able to stitch', async () => {
        const stitch = enstitch({ stitcher, thread }, context);
        console.log(stitch);
      });
    });

    when('thread has context', () => {
      then('it should leverage the knowledge of the context', () => {});
    });
  });
});
