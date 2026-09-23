import { ConstraintError } from 'helpful-errors';

/**
 * .what = the enroll mode a caller STATED, read off the three mode flags
 * .why =
 *   - `computeCloneEnrollMode` takes one `asked` value, because the mode is one axis.
 *     the cli carries it as three independent booleans, because that is what a flag is.
 *     this is the seam between the two shapes, and it owns the one rule the seam needs
 *   - 🔴 a caller who states TWO modes is refused by name, never resolved by precedence.
 *     the prior read was a ternary chain (`watch ? 'watch' : async ? 'async' : null`),
 *     so `--watch --async` silently returned `watch` and the second flag vanished
 *
 * 🔴 .why a clash is a REFUSAL and not a precedence = a precedence is undetectable from
 *   the output. the enroll succeeds, the clone stands up, the exit is 0 — and the caller
 *   reads a well-formed result produced by a mode they did not ask for. that is the exact
 *   shape `define.invariant.an-unknown-flag-is-refused-never-dropped` forbids one grain
 *   out: the flag was RECOGNIZED and then discarded, which costs a caller the same as a
 *   drop and is just as invisible
 *
 *   ⇒ and the cost grew with the axis. two modes have one clashing pair; three have three
 *     pairs plus a triple, so a precedence chain hides four distinct asks rather than one
 *
 * .note = an absent ask is `null`, never a default. the default is nature's to pick
 *   (`computeCloneEnrollMode`), and a default chosen here would be a second owner of it
 */
export const asCloneEnrollModeAsked = (input: {
  /** did the caller state `--watch`? */
  watch: boolean;
  /** did the caller state `--async`? */
  async: boolean;
  /** did the caller state `--await`? */
  await: boolean;
}): 'watch' | 'async' | 'await' | null => {
  // name every mode the caller stated, so a refusal can name them rather than count them
  const stated = (
    [
      ['watch', input.watch],
      ['async', input.async],
      ['await', input.await],
    ] as const
  )
    .filter(([, on]) => on)
    .map(([name]) => name);

  // refuse a clash by name — the caller asked for two things at once, and exactly
  // one of them would have happened with no signal about the other
  if (stated.length > 1)
    ConstraintError.throw(
      `can not enroll a clone in more than one mode. asked for ${stated
        .map((name) => `--${name}`)
        .join(' and ')} — pick one`,
      { stated },
    );

  return stated[0] ?? null;
};
