/**
 * .what = classify whether an actor's live-clone count warrants an accrual warn
 * .why =
 *   - a bare `rhx enroll` is create-always by design (the wish), so a cron that
 *     retries accrues billed brains unbounded. this soft WARN makes the accrual
 *     VISIBLE before it compounds (rule.require.status-feedback) — it never
 *     BLOCKS (a hard cap would fight the wish's create-always intent)
 *   - the threshold is passed in, not owned here, so the council can tune the
 *     value in one place without a change to this classifier
 *
 * .note = the WARN fires when the count REACHES the threshold (>=); the count
 *   includes the clone just spawned. below it, a legitimate small parallel burst
 *   is never nagged
 */
export const computeCloneAccrualWarn = (input: {
  liveCount: number;
  threshold: number;
}): { warn: boolean; liveCount: number } => ({
  warn: input.liveCount >= input.threshold,
  liveCount: input.liveCount,
});
