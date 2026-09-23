import { isCloneSocketEligible } from './isCloneSocketEligible';

/**
 * .what = the socket-eligibility gate over the {brain, noSocket} cube
 * .note = 'claude' is socket-capable, so these cases vary the opt-out axis; the
 *   brain-capability axis is proven in isBrainSocketCapable's own test
 *
 * 🔴 .note = an `attended` axis sat in this cube until 2026-09-16, and its
 *   "UNATTENDED → not eligible" row is the defect itself, written down as an
 *   expectation. a clone that enrolls a peer, a cron, and a supervisor each have no
 *   tty, so that row made the machine-handoff path return an address which by
 *   construction could not hear — and, because the same gate decides whether a pty
 *   is taken at all, the brain-cli then saw a non-tty stdin, auto-enabled `--print`,
 *   and died. the axis is REMOVED rather than re-valued: attendance decides the
 *   MODE (watch vs async), never the REACH
 *   (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
 *
 * ⚠️ .note = the removal REVERSED a verdict, and the line above does not say so on
 *   its own. the deleted row read `{ interactive: false } → expect false`; the
 *   `[clamp]` case below reads `{ ...{ attended: false } } → expect true`. so a
 *   no-tty clone went from NOT eligible to eligible — a green assertion became a red
 *   one, deliberately, because the green one encoded the defect
 */
const TEST_CASES: {
  description: string;
  given: { noSocket: boolean };
  expect: boolean;
}[] = [
  {
    description: 'capable + not-opted-out → eligible',
    given: { noSocket: false },
    expect: true,
  },
  {
    description: 'capable but --no-socket → not eligible',
    given: { noSocket: true },
    expect: false,
  },
];

describe('isCloneSocketEligible', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isCloneSocketEligible({
          brain: 'claude',
          noSocket: thisCase.given.noSocket,
        }),
      ).toEqual(thisCase.expect);
    }),
  );

  /**
   * 🔴 .the clamp = the gate must not READ attendance at all.
   *
   * .why a type test does not suffice = the axis could be re-added as an optional
   *   field and the suite above would still pass. this asserts the invariant on the
   *   VALUE: whatever an attendance flag would have said, the verdict is the same
   */
  test('[clamp] the verdict is INDEPENDENT of any attendance signal', () => {
    // both shapes carry the same two real axes; one smuggles an attendance flag
    const withoutFlag = isCloneSocketEligible({
      brain: 'claude',
      noSocket: false,
    });
    const withFlagFalse = isCloneSocketEligible({
      brain: 'claude',
      noSocket: false,
      // .note = deliberate excess property through a spread — the gate must ignore
      //   an attendance signal even when a caller hands it one
      ...{ attended: false },
    });
    expect(withoutFlag).toEqual(true);
    expect(withFlagFalse).toEqual(true);
  });
});
