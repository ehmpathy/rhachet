import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { genCloneHistoryRelink } from './genCloneHistoryRelink';
import { getCloneSubmittedCount } from './getCloneSubmittedCount';

/**
 * .what = get whether a clone's dispatched message landed — poll the clone's
 *   transcript until the message's occurrence count rises above the pre-dispatch
 *   baseline; the deterministic read `say` waits on to prove its message left the
 *   input buffer and was submitted
 * .why =
 *   - a `delivered` ack from the socket proves only that bytes reached the pty write,
 *     NOT that the brain submitted them. the brain records the user turn to its
 *     transcript verbatim ON submit, so a rise in the count is the honest signal that
 *     the message actually left the input box (dogfood 2026-08-12: bytes acked
 *     `delivered`, yet the real claude submitted no turn — no transcript at all)
 *   - this is FAST (the user turn is written on submit, long before the assistant
 *     reply) and deterministic (our own text), so `say` can self-verify submission
 *     without any wait on the nondeterministic reply
 *
 * .note = each tick re-links the transcript explicitly (genCloneHistoryRelink, so a
 *   lazily-written transcript is picked up) THEN reads the pure count. returns true the
 *   instant the count rises, or false once the wall-clock bound elapses — the caller
 *   fails loud on false
 */
export const getCloneSubmitLanded = async (input: {
  repoPath: string;
  clone: CloneOndisk;
  message: string;
  baselineCount: number;
  timeoutMs: number;
  pollMs?: number;
}): Promise<boolean> => {
  const pollMs = input.pollMs ?? 250;
  const deadline = Date.now() + input.timeoutMs;

  while (Date.now() < deadline) {
    // refresh the transcript link (explicit side effect), then read the pure count
    genCloneHistoryRelink({ repoPath: input.repoPath, clone: input.clone });
    const count = getCloneSubmittedCount({
      clone: input.clone,
      message: input.message,
    });
    if (count > input.baselineCount) return true;
    await new Promise<void>((done) => setTimeout(done, pollMs));
  }
  return false;
};
