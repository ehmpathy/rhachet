import { getError } from 'test-fns';

import { asCloneEnrollModeAsked } from './asCloneEnrollModeAsked';

/**
 * .what = the read of one stated mode off the three cli mode flags
 * .why = the seam between three independent booleans and one axis value. its one rule is
 *   that a caller who states TWO modes is refused by name, never resolved by precedence
 */
const TEST_CASES: {
  description: string;
  given: { watch: boolean; async: boolean; await: boolean };
  expect: 'watch' | 'async' | 'await' | null;
}[] = [
  {
    description:
      '[case1] no flag states no mode — the default is nature`s to pick, never this seam`s',
    given: { watch: false, async: false, await: false },
    expect: null,
  },
  {
    description: '[case2] --watch alone',
    given: { watch: true, async: false, await: false },
    expect: 'watch',
  },
  {
    description: '[case3] --async alone',
    given: { watch: false, async: true, await: false },
    expect: 'async',
  },
  {
    description:
      '[case4] --await alone — the value that was DERIVABLE and not statable for a release',
    given: { watch: false, async: false, await: true },
    expect: 'await',
  },
];

/**
 * 🔴 .the clamp cases = two modes at once is a REFUSAL, never a precedence.
 *
 * .why this is the row that bites = the prior read was a ternary chain
 *   (`watch ? 'watch' : async ? 'async' : null`), so `--watch --async` returned `watch`,
 *   the second flag vanished, and the exit was 0. that is
 *   `define.invariant.an-unknown-flag-is-refused-never-dropped` one grain in: the flag was
 *   RECOGNIZED and then discarded, which costs the caller exactly what a drop costs and is
 *   just as invisible.
 *
 * ⇒ so each row asserts the refusal NAMES BOTH flags. a refusal that merely counted them
 *   would leave the caller to guess which of their two asks the tool saw.
 *
 * .the dogfood note = restore the ternary chain in `asCloneEnrollModeAsked` and every row
 *   below reddens.
 */
const CLAMP_CASES: {
  description: string;
  given: { watch: boolean; async: boolean; await: boolean };
  expect: string[];
}[] = [
  {
    description: '[clamp1] --watch --async',
    given: { watch: true, async: true, await: false },
    expect: ['--watch', '--async'],
  },
  {
    description: '[clamp2] --watch --await',
    given: { watch: true, async: false, await: true },
    expect: ['--watch', '--await'],
  },
  {
    description: '[clamp3] --async --await',
    given: { watch: false, async: true, await: true },
    expect: ['--async', '--await'],
  },
  {
    description:
      '[clamp4] all three — the triple the two-mode axis never had to refuse',
    given: { watch: true, async: true, await: true },
    expect: ['--watch', '--async', '--await'],
  },
];

describe('asCloneEnrollModeAsked', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(asCloneEnrollModeAsked(thisCase.given)).toEqual(thisCase.expect);
    }),
  );

  CLAMP_CASES.forEach((thisCase) =>
    test(thisCase.description, async () => {
      const error = await getError(async () =>
        asCloneEnrollModeAsked(thisCase.given),
      );
      expect(error.message).toContain('more than one mode');
      thisCase.expect.forEach((flag) => expect(error.message).toContain(flag));
    }),
  );
});
