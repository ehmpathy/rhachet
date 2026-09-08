import { HelpfulError } from 'helpful-errors';

import { asCliErrorFrame } from './asCliErrorFrame';
import { asCliErrorJson } from './asCliErrorJson';
import { getExitCodeFromError } from './getExitCodeFromError';

/**
 * .what = run a cli action, render any EXPECTED failure per `--output`, and set
 *   the semantic exit code — ONE catch, ONE shape, for every talk verb
 * .why =
 *   - all six invokers (enroll + actor/clone list/say/get/whoami) share the same
 *     failure control-flow: a caller-side HelpfulError must render as the human
 *     tree OR the machine json per `--output`, then exit with the right code
 *     (ConstraintError=2, MalfunctionError=1) — this owns it once so the six
 *     never drift
 *   - a NON-HelpfulError is a code defect, NOT a caller fault: it is rethrown
 *     UNCHANGED so its stack propagates and it is never masked as a friendly
 *     report (rule.forbid.failhide)
 *
 * .note = the error channel is stderr (the success channel is stdout), so a
 *   machine that pipes stdout gets clean data and reads failures off stderr +
 *   the exit code
 */
export const withCliOutputErrors = async (input: {
  outputRaw: string | undefined;
  run: () => Promise<void>;
}): Promise<void> => {
  try {
    await input.run();
  } catch (error) {
    // a non-helpful error is a real defect — rethrow so its stack is never hidden
    if (!(error instanceof HelpfulError)) throw error;

    const shape = asCliErrorJson({ error });
    process.exitCode = getExitCodeFromError({ error });

    // machine channel: the structured error a consumer branches on by field
    if (input.outputRaw === 'json') {
      console.error(JSON.stringify(shape, null, 2));
      return;
    }

    // human channel: name WHOSE it is, then the symptom, then the fix
    //
    // 🚨 the glyph is read off the error's class, never hardcoded. it once was — one
    //   `✋` for every class — so a `MalfunctionError` (ours to repair) and a
    //   `ConstraintError` (yours to amend) rendered identically, and the party was
    //   legible only to a reader who parsed the whole hint. the exit code carried the
    //   distinction for a machine while the screen dropped it for a human
    //   (`rule.forbid.ambiguous-labels`). now both channels read the same class
    //
    // ⚠️ the frame itself is composed by `asCliErrorFrame`, which this file used to own
    //   inline. it moved because a SECOND caller appeared — `invoke.ts`'s top-level catch,
    //   the fallback for every verb that does not wrap — and that caller had drifted into
    //   a third, defective answer to the same question. the extraction is what makes the
    //   two agree by construction rather than by audit
    for (const line of asCliErrorFrame({ error })) console.error(line);
  }
};
