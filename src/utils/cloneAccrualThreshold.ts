/**
 * .what = the live-clone count at which a bare `rhx enroll` emits a soft accrual
 *   WARN (>= this many LIVE clones for one actor)
 * .why =
 *   - a bare enroll is create-always by design (the wish), so a cron that retries
 *     accrues billed brains unbounded. this soft threshold makes the accrual
 *     VISIBLE before it compounds — it NEVER blocks (a hard cap would fight the
 *     create-always intent)
 *   - one home for the value, so the council can tune it in a single place; the
 *     exact number is a flagged fulcrum (best-guessed at 5)
 */
export const CLONE_ACCRUAL_THRESHOLD = 5;
