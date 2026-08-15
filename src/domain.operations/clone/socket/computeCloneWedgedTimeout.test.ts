import { computeCloneSubmitDelay } from './computeCloneSubmitDelay';
import { computeCloneWedgedTimeout } from './computeCloneWedgedTimeout';

// the true send budget for a message = the SAME submit delay the server's write loop uses
// (the content write is instantaneous; only the submit delay scales), so the test asserts
// the window against the real send time, never a hard-coded value that would drift
const trueSendBudgetMs = (messageLength: number): number =>
  computeCloneSubmitDelay({ messageLength });

describe('computeCloneWedgedTimeout', () => {
  test('a short message gets the 30s floor', () => {
    // a short prompt sends well within 30s, so the generous fixed floor applies — this
    // preserves the prior fixed-window behavior for the common case
    expect(computeCloneWedgedTimeout({ messageLength: 10 })).toEqual(30_000);
  });

  test('the window ALWAYS exceeds the true send budget (never false-wedge a healthy send)', () => {
    // the invariant that matters: whatever the length, the in-flight window must outlast
    // the real send time (the scaled submit delay), so a large-but-healthy send is never
    // wedged. the window is derived from the SAME policy, so it moves with the send time
    for (const messageLength of [10, 500, 750, 1000, 3600, 10000, 100000]) {
      const timeout = computeCloneWedgedTimeout({ messageLength });
      expect(timeout).toBeGreaterThan(trueSendBudgetMs(messageLength));
    }
  });

  test('the window is a clean function of the shared submit-delay policy (no drift)', () => {
    // the window = max(floor, trueSendBudget + slack); assert it matches that exact
    // derivation off the shared policy, so a future change keeps them in lockstep
    const messageLength = 3600;
    const expected = Math.max(30_000, trueSendBudgetMs(messageLength) + 10_000);
    expect(computeCloneWedgedTimeout({ messageLength })).toEqual(expected);
  });
});
