/**
 * .what = the exact stderr advisory line a bare `rhx enroll` emits once an actor
 *   crosses the soft live-clone accrual threshold
 * .why =
 *   - the WARN is an advisory a human reads (rule.forbid.friction-hazards): its text
 *     must not drift silently. one owner for the line means one place to change it
 *     and one exact-text unit clamp that catches any drift
 *   - keeps the invoker a narrative — the emit reads `console.error(asCloneAccrualWarnLine(...))`
 *     instead of an inline template with decode-friction (rule.require.named-transformers)
 *
 * .note = the hash is rendered WHOLE. this line hands a human a command to RUN, so the
 *   `@<hash>` inside it must be the actor's real name — `genEnrollmentHash` mints 8 chars,
 *   and a 7-char prefix addresses no actor. an error that names a fix the reader cannot
 *   paste is not a fix (rule.require.errors-name-the-fix, define.address-sigils)
 */
export const asCloneAccrualWarnLine = (input: {
  liveCount: number;
  actorHash: string;
}): string =>
  `⚠ this actor now has ${input.liveCount} live clones — a cron that retries can accrue billed brains. triage with \`rhx clone list @${input.actorHash}\`.`;
