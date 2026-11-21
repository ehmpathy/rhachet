import { ConstraintError } from 'helpful-errors';

import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

/**
 * .what = refuse a first login when no human can answer its browser prompt
 * .why = case=6 — a clone or a pipe that runs `brains auth set` would hang on an oauth prompt no
 *   one will answer; it must fail at once, and name the command for its human
 * .note = a clone runs in a pty, so a tty alone does not prove a human: the clone serial does
 * .note = the login screen renders on stderr, so stdout stays clean for `--output json`; a stderr
 *   that is not a terminal would hide the login screen, so it refuses too
 */
export const assertBrainAuthLoginHasHuman = (input: {
  isStdinTTY: boolean;
  isStderrTTY: boolean;
  env: Record<string, string | undefined>;
}): void => {
  // a clone, even one with a pty, has no human at its browser
  const isClone = !!input.env[CLONE_ENV_KEYS.serial];
  if (!isClone && input.isStdinTTY && input.isStderrTTY) return;
  throw new ConstraintError('a first login needs a human at a browser', {
    why: asWhyNoHuman({ isClone, isStdinTTY: input.isStdinTTY }),
    hint: 'ask your human to run, at a real terminal: rhx brains auth set --brain claude',
  });
};

/**
 * .what = the reason no human can answer, the most specific first
 */
const asWhyNoHuman = (input: {
  isClone: boolean;
  isStdinTTY: boolean;
}): string => {
  if (input.isClone) return 'this runs inside a clone';
  if (!input.isStdinTTY) return 'stdin is not a terminal';
  return 'stderr is not a terminal, so the login screen would not be seen';
};
