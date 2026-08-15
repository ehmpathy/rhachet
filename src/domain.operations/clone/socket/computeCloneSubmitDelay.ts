import {
  CLONE_SUBMIT_DELAY_CAP_MS,
  CLONE_SUBMIT_DELAY_FLOOR_MS,
  CLONE_SUBMIT_DELAY_PER_CHAR_MS,
} from './constants';

/**
 * .what = the pause between a clone's BULK content write and its submit `\r`, scaled to
 *   the message length — long enough for claude to commit the pasted buffer before Enter
 * .why =
 *   - the server bulk-writes the whole message in one pty write (NOT char-at-a-time — a
 *     booted claude accepts a bulk content write, proven 2026-08-13), then submits with a
 *     `\r`. claude commits a paste asynchronously, and a LARGER paste takes LONGER to
 *     commit; if the `\r` lands before the commit, the Enter submits an empty/partial line
 *     and the message is left unsent (real-haiku probe: 8ms holds a short message but a
 *     3728-char paste needs ~1s)
 *   - so the delay SCALES with length (per-char commit allowance), with a floor for short
 *     messages and a cap to bound the wait; unlike the retired char-at-a-time cadence,
 *     only THIS one pause grows with size — the content write itself is instantaneous
 *
 * .note = 0.3ms/char covered 3728 chars with margin (1118ms); a much larger message should
 *   be probed before the cap is trusted (see lesson.clone-say-bulk-write-works)
 */
export const computeCloneSubmitDelay = (input: {
  messageLength: number;
}): number =>
  Math.max(
    CLONE_SUBMIT_DELAY_FLOOR_MS,
    Math.min(
      CLONE_SUBMIT_DELAY_CAP_MS,
      input.messageLength * CLONE_SUBMIT_DELAY_PER_CHAR_MS,
    ),
  );
