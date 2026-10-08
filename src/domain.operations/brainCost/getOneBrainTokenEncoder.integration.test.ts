import { given, then, when } from 'test-fns';

import { getOneBrainTokenEncoder } from './getOneBrainTokenEncoder';

/**
 * .what = clamps the ONE contract this operation exists to hold — one encoder per process
 * .why = an encoder costs ~1,800ms to construct, so every call must share one instance;
 *        identity is the contract, asserted directly
 */
describe('getOneBrainTokenEncoder', () => {
  given('[case1] a process that has never asked for an encoder', () => {
    when('[t0] it is asked twice', () => {
      then('it hands back the SAME instance', () => {
        const encoderFirst = getOneBrainTokenEncoder();
        const encoderSecond = getOneBrainTokenEncoder();

        // 🔴 `toBe`, never `toEqual`. two separately constructed encoders are deeply equal
        //    — same vocabulary, same tables — so `toEqual` would pass against the very
        //    defect this clamps. identity is the only assertion that bites here
        expect(encoderSecond).toBe(encoderFirst);
      });

      then('the encoder it hands back actually encodes', () => {
        // the positive control. an identity assertion alone would pass if the operation
        // returned one shared `null`-ish value, so the shared instance is proven usable
        const encoder = getOneBrainTokenEncoder();

        expect(encoder.encode('a surfer paddles out').length).toBeGreaterThan(
          0,
        );
      });
    });
  });
});
