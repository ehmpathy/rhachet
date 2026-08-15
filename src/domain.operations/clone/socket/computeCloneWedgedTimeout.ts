import { computeCloneSubmitDelay } from './computeCloneSubmitDelay';
import {
  CLONE_WEDGED_TIMEOUT_FLOOR_MS,
  CLONE_WEDGED_TIMEOUT_SLACK_MS,
} from './constants';

/**
 * .what = the in-flight ("wedged") timeout for one dispatch, scaled to the message length
 * .why =
 *   - the server BULK-writes the content in one pty write, then submits with a `\r` after
 *     computeCloneSubmitDelay; the `delivered` ack fires only AFTER that whole sequence
 *     completes. so a long message legitimately takes (submit-delay) longer to reach
 *     `delivered` than a short one (the content write itself is instantaneous)
 *   - a FIXED window would falsely call a large-but-healthy send "wedged" once its send
 *     time crossed the window. a length-scaled window stays longer than the true send
 *     time, so only a genuinely stalled clone (one that never acks) trips it
 *   - the send budget is derived from the SAME computeCloneSubmitDelay the server's write
 *     loop uses, so the window and the real send time can never drift — a policy change
 *     moves both together
 *
 * .note = a floor keeps short prompts on a generous fixed window; the scale + slack only
 *   raises it for a message whose submit delay approaches the floor
 */
export const computeCloneWedgedTimeout = (input: {
  messageLength: number;
}): number => {
  const sendBudgetMs = computeCloneSubmitDelay({
    messageLength: input.messageLength,
  });
  return Math.max(
    CLONE_WEDGED_TIMEOUT_FLOOR_MS,
    sendBudgetMs + CLONE_WEDGED_TIMEOUT_SLACK_MS,
  );
};
