import { ConstraintError } from 'helpful-errors';

/**
 * .what = which of a clone's three surfaces a `get` reads — the source-of-truth tuple
 * .why = a clone holds a message in one of three places, and they are three DIFFERENT reads off
 *   two different sources (define.brain-cli-input-states):
 *
 *     state      surface        source
 *     buffered → the input box  the rendered screen, over the live socket
 *     enqueued → the queue      the rendered screen, over the live socket
 *     released → the transcript the brain's own jsonl, off disk
 *
 *   ⇒ so `--what` is not a filter on one read; it names WHICH read to take. `story` is the
 *   disk read (the extant `clone get` behavior, so the default preserves every caller), and
 *   `buffer`/`queue` are the screen reads this wish's channel made possible (F15)
 * .note = the type DERIVES from this tuple, so a fourth surface is compiler-forced into the
 *   parse below rather than silently unparsed
 */
const CLONE_GET_WHAT_VALUES = ['story', 'buffer', 'queue'] as const;
export type CloneGetWhat = (typeof CLONE_GET_WHAT_VALUES)[number];

/**
 * .what = whether a `--what` read needs a LIVE socket probe rather than the disk
 * .why = the two screen surfaces share every precondition (a live daemon, a probe-capable peer,
 *   an attached feed) and the disk read shares none of them — it works on a DEAD clone. so the
 *   CLI branches on THIS rather than on a value list it would have to keep in step
 */
export const isCloneGetWhatLive = (what: CloneGetWhat): boolean =>
  what === 'buffer' || what === 'queue';

/**
 * .what = parse the `--what` flag into the surface to read
 * .why = `story` is the DEFAULT, so the bare `rhx clone get @:x` a caller types today reads the
 *   transcript exactly as it did before this flag existed — the additive guarantee (V13). an
 *   unknown value fails loud with the closed set named, never falls back to the default: a
 *   silent fallback would answer a `--what buffr` with a transcript and let a human conclude
 *   their box was empty (rule.forbid.failhide)
 */
export const asCloneGetWhat = (input: { raw: string }): CloneGetWhat => {
  const found = (CLONE_GET_WHAT_VALUES as readonly string[]).includes(
    input.raw,
  );
  if (!found)
    throw new ConstraintError(`invalid --what "${input.raw}"`, {
      hint: `use one of: ${CLONE_GET_WHAT_VALUES.join(' | ')} (story = the transcript, the default; buffer = the input box; queue = submitted but unreleased)`,
    });
  return input.raw as CloneGetWhat;
};
