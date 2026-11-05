import { getError, given, then, when } from 'test-fns';
import { z } from 'zod';

import { asMockedBrainOutput } from './asMockedBrainOutput';

const schema = z.object({ answer: z.string() });

describe('asMockedBrainOutput', () => {
  given('[case1] an output the schema accepts', () => {
    when('[t0] asMockedBrainOutput is called', () => {
      then('it returns the parsed output', () => {
        expect(
          asMockedBrainOutput({
            mock: 'genMockedBrainRepl',
            verb: 'ask',
            schema,
            output: { answer: 'hi' },
          }),
        ).toEqual({ answer: 'hi' });
      });
    });
  });

  given('[case2] an output the schema refuses', () => {
    when('[t0] asMockedBrainOutput is called', () => {
      then(
        'it refuses, and names the told output, the key and the field to fix',
        async () => {
          const error = await getError(async () =>
            asMockedBrainOutput({
              mock: 'genMockedBrainAtom',
              verb: 'ask',
              schema,
              output: { verdict: 'ok' },
            }),
          );
          expect(error.message).toContain(
            "genMockedBrainAtom's answer to 'ask' does not fit the caller's schema",
          );
          expect(error.message).toContain('"verdict": "ok"');
          expect(error.message).toContain('"path": "answer"');
          expect(error.message).toContain('set output.ask');
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });
});
