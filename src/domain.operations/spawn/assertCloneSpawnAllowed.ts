import { ConstraintError } from 'helpful-errors';

/**
 * .what = refuse a spawn whose caller is a LEAF — a print-mode clone or a repl brain
 * .why =
 *   - every work clone may enroll one more clone, at any depth; a leaf may enroll no one
 *     (ehmpathy/rhachet#577). so the one refusal is on the caller's leaf mark, never on
 *     its depth
 *   - one refusal for both spawn doors (`rhx enroll` and the repl seam), so a leaf reads
 *     the same line whichever door it tried
 *   - it fires BEFORE any dir, child, or env scope exists, so a chain never half-forms
 *
 * .note = the words name the mechanism (the door that minted the leaf), never a purpose.
 *   rhachet cannot see why a clone was spawned, nor which supplier skill spawned it, so a
 *   refusal that names a purpose or a supplier skill asserts what the framework cannot know
 * .note = the hint never names the leaf env var. an agent reads this refusal, and an
 *   absent var reads as a work clone, so a hint that says "clear the var" is the recipe
 *   to pass the bound
 * .note = the hint speaks to each of its two readers: a clone (do not retry) and a human
 *   in a shell a leaf opened (a fresh terminal). every cure it names routes through a human
 * .note = `via` names the door, and `why` says why the caller is a leaf. neither line
 *   names the var either. the key is not `cause`: helpful-errors reads that key as the
 *   native error cause and never renders it
 */
export const assertCloneSpawnAllowed = (input: {
  isCallerLeaf: boolean;
  door: 'enroll' | 'repl';
}): void => {
  if (!input.isCallerLeaf) return;

  throw new ConstraintError('a leaf clone may not spawn', {
    hint: 'a leaf answers, and spawns no clone of its own. a clone: do not retry — answer from your own read. a human in a shell a leaf opened: run the same command from a fresh terminal',
    via: SPAWN_DOOR_LABELS[input.door],
    why: 'this process is a leaf: a print-mode enroll (`rhx enroll -p`) or a repl brain spawned it, or it runs in a shell or a job that such a leaf started',
  });
};

/**
 * .what = the words a refusal uses to name each spawn door
 * .why = a reader who hit the bound from a repl brain must see that a repl brain is a spawn
 * .note = each label names only rhachet's own commands: `rhx` routes `ask` and `act` to a
 *   skill lookup, so the repl doors are spelled `rhachet ask` and `rhachet act`. a skill a
 *   supplier builds on the sdk is named by its kind, never by its name
 * .note = both labels share one shape, a noun phrase then its commands, so the pair scans alike
 */
const SPAWN_DOOR_LABELS: Record<'enroll' | 'repl', string> = {
  enroll: 'a clone enroll (`rhx enroll`)',
  repl: 'a repl brain (`rhachet ask`, `rhachet act`, or a skill built on the sdk)',
};
