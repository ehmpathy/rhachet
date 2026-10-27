import { ConstraintError } from 'helpful-errors';

/**
 * .what = the refusal a brain dir writer raises when the brain dir's realpath lands outside the repo
 * .why = rhachet never writes outside the repo. a writer refuses with this one class, so init's
 *   phases can read it as a skip — a named `⚠️` warn, never an error row — and every other caller
 *   (an enroll, a test) fails loud on it as the ConstraintError it is
 * .note = metadata carries `path` (the brain dir init aimed at, relative to the repo) and
 *   `landsAt` (its realpath)
 */
export class BrainDirOutsideRepoError extends ConstraintError<{
  path: string;
  landsAt: string;
  hint: string;
}> {}

/**
 * .what = the class name a human reads in the header is the qualified one, `ConstraintError`
 * .why = the cli header prints `error.constructor.name`, and a header must name who fixes it —
 *   `✋ ConstraintError:` (`rule.require.qualified-error-headers`). the subclass exists only to be
 *   told apart by `instanceof`, which reads the prototype chain, never this name
 */
Object.defineProperty(BrainDirOutsideRepoError, 'name', {
  value: ConstraintError.name,
});
