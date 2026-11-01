import { given, then, useBeforeAll, when } from 'test-fns';

import {
  asCharsOfChunkAfterSplitCrlf,
  stdinEnterState,
} from './stdinEnterState';

/**
 * .what = the cut a raw-mode prompt takes on its chunk after a prior prompt's CR
 * .why = a CRLF split across chunks must not hand the next prompt an empty answer, and a
 *   real LF that opens a chunk with no CR before it must still read as an Enter
 */
describe('asCharsOfChunkAfterSplitCrlf', () => {
  given('[case1] the prior prompt ended on a CR that closed its chunk', () => {
    when('[t0] the next chunk opens with the LF of that pair', () => {
      // .note = useBeforeAll hands back a proxy over a Record, so the result rides fields
      const result = useBeforeAll(async () => {
        stdinEnterState.isLfOfCrAwaited = true;
        const chars = asCharsOfChunkAfterSplitCrlf({ chunk: '\nxai-key\r' });
        return {
          text: chars.join(''),
          isFlagAfter: stdinEnterState.isLfOfCrAwaited,
        };
      });

      then('the LF is dropped', () => {
        expect(result.text).toEqual('xai-key\r');
      });

      then('the flag clears', () => {
        expect(result.isFlagAfter).toEqual(false);
      });
    });

    when('[t1] the next chunk opens with aught else', () => {
      const result = useBeforeAll(async () => {
        stdinEnterState.isLfOfCrAwaited = true;
        const chars = asCharsOfChunkAfterSplitCrlf({ chunk: 'xai-key\r' });
        return {
          text: chars.join(''),
          isFlagAfter: stdinEnterState.isLfOfCrAwaited,
        };
      });

      then('the chunk is kept whole', () => {
        expect(result.text).toEqual('xai-key\r');
      });

      then('the flag clears', () => {
        expect(result.isFlagAfter).toEqual(false);
      });
    });
  });

  given('[case2] no CR is awaited', () => {
    when('[t0] a chunk opens with an LF', () => {
      then('the LF is kept, since it is a real Enter', () => {
        stdinEnterState.isLfOfCrAwaited = false;
        const chars = asCharsOfChunkAfterSplitCrlf({ chunk: '\n' });
        expect(chars).toEqual(['\n']);
      });
    });
  });
});
