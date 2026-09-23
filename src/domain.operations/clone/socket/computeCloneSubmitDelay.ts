import {
  CLONE_SUBMIT_DELAY_CAP_MS,
  CLONE_SUBMIT_DELAY_FLOOR_MS,
  CLONE_SUBMIT_DELAY_PER_CHAR_MS,
} from './constants';

/**
 * .what = the length-scaled ESTIMATE of how long claude takes to commit a written buffer
 *   before it can accept the submit `\r`
 * .why =
 *   - the server bulk-writes the whole message in one pty write (NOT char-at-a-time — a
 *     booted claude accepts a bulk content write, proven 2026-08-13), then submits with a
 *     `\r`. claude commits a paste asynchronously, and a LARGER paste takes LONGER to
 *     commit; if the `\r` lands before the commit, the Enter submits an empty/partial line
 *     and the message is left unsent (real-haiku probe: 8ms holds a short message but a
 *     3728-char paste needs ~1s)
 *   - so the estimate SCALES with length (per-char commit allowance), with a floor for
 *     short messages and a cap to bound the wait
 *
 * .where it is still used = it is NO LONGER the write path's primary wait. the daemon now
 *   WATCHES its own live screen for the committed content and submits the instant it
 *   appears (awaitCloneSubmitReady), because this estimate is a guess in both directions —
 *   a 50ms floor lost a 3-line bracketed paste outright (measured 2026-09-17). two readers
 *   remain, and each wants an estimate rather than an observation:
 *   - awaitCloneSubmitReady's DEGRADE path, when no live screen can be read — it falls back
 *     to exactly this sleep, so an unfed feed behaves as the prior write path did
 *   - computeCloneWedgedTimeout, which sizes the in-flight window off the send budget
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
