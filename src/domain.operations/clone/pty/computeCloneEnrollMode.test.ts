import { getError } from 'test-fns';

import { computeCloneEnrollMode } from './computeCloneEnrollMode';

/**
 * .what = the enroll-mode derivation over the {tty, asked, printMode} cube
 * .why = this is the axis that REPLACED `isCloneEnrollAttended`. that predicate fed the
 *   socket gate, so a tty read decided whether a clone could be REACHED; here the same
 *   read decides only what the ENROLLER does with the child
 *   (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
 *
 * 🔴 .note = `asked` carries all THREE values, because all three are statable. `await` was
 *   derivable and not askable for a release, so a caller who wanted *"hand it this prompt
 *   and wait"* had to know that `-p` implies the mode rather than reach for rhachet's own
 *   word for it. the `asked: 'await'` rows below are what make the surface match the axis
 */
const TEST_CASES: {
  description: string;
  given: {
    tty: boolean;
    asked: 'watch' | 'async' | 'await' | null;
    printMode: boolean;
  };
  expect: 'watch' | 'async' | 'await';
}[] = [
  {
    description: '[case1] a human at a terminal defaults to watch',
    given: { tty: true, asked: null, printMode: false },
    expect: 'watch',
  },
  {
    description:
      '[case2] no terminal defaults to async — for a SESSION, which is what the clone outlives its caller for',
    given: { tty: false, asked: null, printMode: false },
    expect: 'async',
  },
  {
    description: '[case3] a human may background their own clone explicitly',
    given: { tty: true, asked: 'async', printMode: false },
    expect: 'async',
  },
  {
    description: '[case4] a human may state watch explicitly at a terminal',
    given: { tty: true, asked: 'watch', printMode: false },
    expect: 'watch',
  },
  {
    description:
      '[case5] 🔴 THE MEASURED DEFECT ROW — a guard lane runs `enroll … -p <prompt>` with no tty, and is owed the answer, never a detach',
    given: { tty: false, asked: null, printMode: true },
    expect: 'await',
  },
  {
    description:
      '[case6] a print-mode enroll AT a terminal is still an `await` — the tty does not make it a session',
    given: { tty: true, asked: null, printMode: true },
    expect: 'await',
  },
  {
    description:
      '[case7] an explicit --async alongside a print flag is HONORED — the caller asked to detach from an answer and owns that',
    given: { tty: false, asked: 'async', printMode: true },
    expect: 'async',
  },
  {
    description:
      '[case8] an explicit --watch at a terminal outranks the print flag — the mirror carries the answer',
    given: { tty: true, asked: 'watch', printMode: true },
    expect: 'watch',
  },
  {
    description:
      '[case9] an explicit --await with a prompt is honored — the caller reached for rhachet`s own word for the mode',
    given: { tty: false, asked: 'await', printMode: true },
    expect: 'await',
  },
  {
    description:
      '[case10] an explicit --await AT a terminal is still an await — the caller asked to wait, and a terminal does not un-ask it',
    given: { tty: true, asked: 'await', printMode: true },
    expect: 'await',
  },
];

describe('computeCloneEnrollMode', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(
        computeCloneEnrollMode({
          tty: thisCase.given.tty,
          asked: thisCase.given.asked,
          printMode: thisCase.given.printMode,
        }),
      ).toEqual(thisCase.expect);
    }),
  );

  /**
   * 🔴 .the clamp = `--watch` with no terminal is IMPOSSIBLE, never merely odd.
   *
   * .why fail loud rather than silently fall back to async = the caller stated an
   *   intent the environment cannot satisfy. to quietly hand back the other mode is
   *   the shape of the original defect — a verdict the caller did not ask for and
   *   cannot observe (`rule.require.failfast`)
   */
  test('[clamp] an explicit watch with no tty fails loud', async () => {
    const error = await getError(async () =>
      computeCloneEnrollMode({ tty: false, asked: 'watch', printMode: false }),
    );
    expect(error.message).toContain('watch');
    expect(error.message).toContain('no tty');
  });

  /**
   * 🔴 .the clamp = `--await` with no prompt is a HANG, and the hang is UNBOUNDED.
   *
   * .why this one has to fail loud = an `await` holds the enroller until the child exits,
   *   and a brain-cli session does not exit — it waits for input forever. so the wait
   *   would never settle, and the caller would read it as a slow enroll rather than as
   *   their own input defect. the other two askable values have no such floor: a `watch`
   *   needs a terminal (the clamp above), an `async` needs neither.
   *
   * .why the error must NAME the remedy = the prompt rides in on the brain's own
   *   passthrough (`-p` / `--print`), never on a flag of rhachet's own, so a caller who
   *   hits this needs to be told where the prompt goes — a second surface for it would be
   *   a synonym (`rule.forbid.domain-term-synonyms`).
   *
   * .the dogfood note = drop the `asked === 'await' && !printMode` row from
   *   `computeCloneEnrollMode` and this reddens.
   */
  test('[clamp] an explicit await with no prompt fails loud, and names the remedy', async () => {
    const error = await getError(async () =>
      computeCloneEnrollMode({ tty: true, asked: 'await', printMode: false }),
    );
    expect(error.message).toContain('await');
    expect(error.message).toContain('no prompt');
    expect(error.message).toContain('-p');
    expect(error.message).toContain('--async');
  });

  /**
   * 🔴 .the clamp = a print-mode enroll must NEVER derive `async`, at any tty state.
   *
   * .why this is the clamp that bites = `async` is the mode that DETACHES, and a
   *   detached enroll returns a banner rather than the child's answer. so an `async`
   *   verdict here is the measured defect exactly: three l3 review lanes ran
   *   `enroll … -p '<prompt>'` as a no-tty subprocess, got the banner on stdout, and
   *   every one graded `💥 malfunction: reviewer output lacks a numeric count`.
   *
   * .the dogfood note = drop the `if (input.printMode) return 'await'` row from
   *   `computeCloneEnrollMode` and the `tty: false` half of this reddens.
   */
  test('[clamp] a print-mode enroll never detaches, whatever the terminal', () => {
    [true, false].forEach((tty) =>
      expect(
        computeCloneEnrollMode({ tty, asked: null, printMode: true }),
      ).not.toEqual('async'),
    );
  });

  /**
   * 🔴 .the clamp = the print-mode signal comes from the PASSTHROUGH, never the tty.
   *
   * .why = the tty answers *"is there a terminal to mirror into?"*. it cannot answer
   *   *"does this invocation owe an answer?"* — and a derivation that reads the tty for
   *   the second question is the identical shape as the `interactive: !!isTTY` defect
   *   this wish already cured one surface over. so the two inputs must move the verdict
   *   INDEPENDENTLY, and this asserts the print-mode signal alone is enough
   */
  test('[clamp] the await verdict is independent of the tty', () => {
    expect(
      computeCloneEnrollMode({ tty: false, asked: null, printMode: true }),
    ).toEqual(
      computeCloneEnrollMode({ tty: true, asked: null, printMode: true }),
    );
  });

  /**
   * 🔴 .the clamp = the derivation must not read an ATTENDANCE signal.
   *
   * .why = `isCloneEnrollAttended` folded `byClone` into this read, and that fold is
   *   what let a peer-enrolled clone claim a foreground it had no terminal for. the
   *   caller's identity changes who will TALK to the clone, never whether a terminal
   *   exists to mirror it into
   */
  test('[clamp] the mode is INDEPENDENT of who enrolled the clone', () => {
    const byHuman = computeCloneEnrollMode({
      tty: false,
      asked: null,
      printMode: false,
    });
    const byClone = computeCloneEnrollMode({
      tty: false,
      asked: null,
      printMode: false,
      // .note = deliberate excess property through a spread — an attendance signal
      //   must not move the verdict
      ...{ byClone: true },
    });
    expect(byHuman).toEqual('async');
    expect(byClone).toEqual('async');
  });
});
