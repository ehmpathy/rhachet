/**
 * .what = announce that a per-key `maxDuration` cap shortened the requested duration
 * .why = the cap is a policy the human did not ask for, so a silent application would make
 *        a shorter-than-requested ttl read as a defect rather than as the rule it is
 *
 * .note = this is the i/o half of a deliberate split. `computeExpiresAt` REPORTS the cap as
 *         `cappedByMaxDuration` and writes no output — it carries the `compute*` prefix,
 *         which `define.domain-operation-grains` reserves for a pure transformer. the
 *         announce lives here so the orchestrator reads as narrative and the write is
 *         encapsulated
 *
 * .note = the third bound (the grant's own life) is deliberately NOT announced. it wins on
 *         every github-app unlock — 55m beats the 540m default — so a notice on it would
 *         fire on the normal path, and a caution a reader learns to skip takes this one down
 *         with it. the `expires in:` leaf already renders that bound
 */
export const emitKeyrackDurationCapWarn = (input: {
  slug: string;
  maxDuration: string;
}): void => {
  console.warn(
    `⚠️ duration capped to ${input.maxDuration} for key ${input.slug} (maxDuration limit)`,
  );
};
