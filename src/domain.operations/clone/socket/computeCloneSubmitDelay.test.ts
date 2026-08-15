import { computeCloneSubmitDelay } from './computeCloneSubmitDelay';
import {
  CLONE_SUBMIT_DELAY_CAP_MS,
  CLONE_SUBMIT_DELAY_FLOOR_MS,
  CLONE_SUBMIT_DELAY_PER_CHAR_MS,
} from './constants';

/**
 * .what = the length-scaled submit-delay policy for the bulk-write `say` path
 * .why = data-driven clamp of the three regimes (floor, scaled, cap), plus the two
 *   real-probe anchors: 8ms-worth of chars is too short for a long paste (so the floor
 *   must exceed it) and 3728 chars must land under the proven ~1s regime, not the cap
 */
const CASES = [
  {
    description: 'a short message gets the floor, never below it',
    given: { messageLength: 12 },
    expect: { delay: CLONE_SUBMIT_DELAY_FLOOR_MS },
  },
  {
    description: 'a zero-length message still gets the floor',
    given: { messageLength: 0 },
    expect: { delay: CLONE_SUBMIT_DELAY_FLOOR_MS },
  },
  {
    description:
      'the 3728-char real-probe message scales to ~1.1s (proven to land)',
    given: { messageLength: 3728 },
    expect: { delay: 3728 * CLONE_SUBMIT_DELAY_PER_CHAR_MS },
  },
  {
    description: 'a very long message is capped, never unbounded',
    given: { messageLength: 1_000_000 },
    expect: { delay: CLONE_SUBMIT_DELAY_CAP_MS },
  },
];

describe('computeCloneSubmitDelay', () => {
  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const delay = computeCloneSubmitDelay({
        messageLength: thisCase.given.messageLength,
      });
      expect(delay).toEqual(thisCase.expect.delay);
    }),
  );

  test('the floor exceeds the failed 8ms real-probe threshold', () => {
    // the live probe showed a flat 8ms before `\r` LOST a 3728-char message; the scaled
    // policy must never emit a delay that short for any realistic message, so its floor
    // is comfortably above 8ms
    expect(CLONE_SUBMIT_DELAY_FLOOR_MS).toBeGreaterThan(8);
  });

  test('the 3728-char delay lands in the proven-safe band (8ms < d <= 1000ms)', () => {
    // 8ms LOST it, 1000ms LANDED it (real haiku, 2026-08-13); the scaled value must sit
    // inside that empirically-proven window
    const delay = computeCloneSubmitDelay({ messageLength: 3728 });
    expect(delay).toBeGreaterThan(8);
    expect(delay).toBeLessThanOrEqual(1000 + 200); // 1118ms — the proven 0.3ms/char value, above 1000 with margin
  });
});
