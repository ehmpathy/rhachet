import { ConstraintError } from 'helpful-errors';

import { asCloneReachError } from './asCloneReachError';
import type { CloneReachState } from './computeCloneReachState';

/**
 * .what = unit-covers asCloneReachError's cause SELECTION — the DEAF vs
 *   DEAD-same-host vs DEAD-cross-host branch a machine + a human both depend on
 * .why = a pure transformer with real branch logic owes a data-driven unit test
 *   (rule.require.test-coverage-by-grain + rule.prefer.data-driven). the host-match
 *   comparison (same → DEAD-same-host, differ → DEAD-cross-host) is the crux of the
 *   uc10 cross-host reach, and the reachState/reachCause it stamps into the error
 *   metadata is the field asCliErrorJson reads (never re-derives) — so this clamps
 *   both the branch and the metadata contract
 */
const TEST_CASES: {
  description: string;
  given: {
    reachState: Exclude<CloneReachState, 'LIVE'>;
    cloneHostHash: string;
    currentHostHash: string;
  };
  expect: { cause: string; messageIncludes: string; hintIncludes: string };
}[] = [
  {
    description: 'DEAF → cause DEAF, names the socket re-enroll fix',
    given: {
      reachState: 'DEAF',
      cloneHostHash: 'h1',
      currentHostHash: 'h1',
    },
    expect: {
      cause: 'DEAF',
      messageIncludes: 'no dispatch socket',
      hintIncludes: 're-enroll',
    },
  },
  {
    description:
      'DEAD on the SAME host → cause DEAD-same-host, names a plain re-enroll',
    given: {
      reachState: 'DEAD',
      cloneHostHash: 'same-host',
      currentHostHash: 'same-host',
    },
    expect: {
      cause: 'DEAD-same-host',
      messageIncludes: 'socket is gone',
      hintIncludes: 're-enroll',
    },
  },
  {
    description:
      'DEAD on a DIFFERENT host → cause DEAD-cross-host, names the other host',
    given: {
      reachState: 'DEAD',
      cloneHostHash: 'host-A',
      currentHostHash: 'host-B',
    },
    expect: {
      cause: 'DEAD-cross-host',
      messageIncludes: 'host-A',
      hintIncludes: 'from the host',
    },
  },
];

describe('asCloneReachError', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      const error = asCloneReachError(thisCase.given);

      // a caller-fault ConstraintError (exit 2), never a server MalfunctionError
      expect(error).toBeInstanceOf(ConstraintError);
      expect(error.code?.exit).toEqual(2);

      // the human message names this cause's distinct symptom (proves the branch)
      expect(error.message).toContain(thisCase.expect.messageIncludes);

      // a machine reads cause + reachState off the metadata (the field asCliErrorJson
      // reads, never re-derives) — the same boundary access asCliErrorJson uses
      const metadata =
        (error as { metadata?: Record<string, unknown> }).metadata ?? {};
      expect(metadata.reachCause).toEqual(thisCase.expect.cause);
      expect(metadata.reachState).toEqual(thisCase.given.reachState);
      expect(metadata.hint).toContain(thisCase.expect.hintIncludes);
    }),
  );
});
