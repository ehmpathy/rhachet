/**
 * .what = the hint a held claude login write lock gives, which names the verb to retry
 * .why = two verbs take the lock (an `enroll` adopts a brain-dir login, a `use` swaps the grove
 *   login), and a human who hits the wait retries the one they ran, so each names its own
 */
export const asBrainAuthWriteLockHint = (input: {
  retry: 'enroll' | 'use';
}): string =>
  `a live claude-code process holds the lock past the wait; retry the ${input.retry}. a lock dir older than 15s is stale, and is cleared on the next try`;
