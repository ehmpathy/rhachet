import { isCloneSayToSelf } from './isCloneSayToSelf';

/**
 * .what = the self-say predicate over the {callerSerial, targetSerial} cube
 * .why = a self-say DISPATCHES like any other, and `true` here clamps exactly ONE
 *   knob — the await target lowers to `enqueue`, since the caller's own queue cannot
 *   drain until this very say returns. the cube is small and closed: the caller is
 *   absent, differs, or matches
 *
 * 🔴 .note = the MATCH row once meant REFUSE, and that was the defect. the refusal
 *   rested on two mechanisms labelled `nature`, both refuted by this wish's own later
 *   measurements — the full record is in the predicate's docblock and in
 *   `define.invariant.clone-say-to-self-is-await-clamped-never-refused`. measured
 *   2026-09-20, a real clone said to its own address and got `delivered: true` /
 *   `verdict: enqueued` / `probe: capable`, with the message landed as a turn
 */
const TEST_CASES: {
  description: string;
  given: { callerSerial: string | null; targetSerial: string };
  expect: boolean;
}[] = [
  {
    description: 'no clone issued it (a human shell) → never a self-say',
    given: {
      callerSerial: null,
      targetSerial: 'aaaaaaaa-0000-4000-8000-0000000000aa',
    },
    expect: false,
  },
  {
    description: 'a clone says to a DIFFERENT clone → not a self-say',
    given: {
      callerSerial: 'bbbbbbbb-0000-4000-8000-0000000000bb',
      targetSerial: 'aaaaaaaa-0000-4000-8000-0000000000aa',
    },
    expect: false,
  },
  {
    description: '🔴 a clone says to its OWN serial → a self-say',
    given: {
      callerSerial: 'aaaaaaaa-0000-4000-8000-0000000000aa',
      targetSerial: 'aaaaaaaa-0000-4000-8000-0000000000aa',
    },
    expect: true,
  },
];

describe('isCloneSayToSelf', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(isCloneSayToSelf(thisCase.given)).toEqual(thisCase.expect);
    }),
  );

  /**
   * 🔴 .the clamp = an ABSENT caller must never read as a self-say, however the
   *   absence is spelled.
   *
   * .why a case row does not suffice = `process.env[...]` hands back `undefined`,
   *   and the boundary narrows it to `null`. were that narrow ever dropped, an
   *   `undefined === undefined` comparison would read EVERY say from a non-clone
   *   as a self-say and clamp every `--await release` in the repo to `enqueue` —
   *   a silent downgrade of the knob, since the clamp reports on stderr and exits
   *   0. this asserts the predicate is keyed on a real serial match, never on two
   *   absences that merely match each other
   */
  test('[clamp] two ABSENT serials never match (every await would downgrade)', () => {
    // .note = the deliberate cast smuggles the pre-narrow shape past the type, so
    //   the VALUE is asserted rather than the declaration
    const bothAbsent = isCloneSayToSelf({
      callerSerial: null,
      targetSerial: undefined as unknown as string,
    });
    expect(bothAbsent).toEqual(false);
  });
});
