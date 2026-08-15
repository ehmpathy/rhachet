import { HelpfulError } from 'helpful-errors';

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

    // human channel: name the symptom then the fix
    console.error('');
    console.error(`✋ ${shape.message}`);
    if (shape.hint) console.error(`   └─ ${shape.hint}`);
    console.error('');
  }
};
