/**
 * .what = whether a say dispatch names the very clone that issues it
 * .why = a self-say is DISPATCHED like any other, and exactly ONE of its knobs is
 *   unreachable: `--await release`. so this predicate clamps the await target; it is
 *   not a gate on the verb (rule.forbid.deferrals-short-of-a-dedicated-pr)
 *
 *   - `released` needs a transcript rise AND an empty queue
 *     (`computeCloneSayVerdict.ts:184`). the caller runs INSIDE its own active turn —
 *     the `clone say` process IS a tool call the brain runs — so its own queue cannot
 *     drain until this very say returns
 *   - ⇒ `--await release` against self would poll the whole bound for a drain that is
 *     impossible WHILE it polls. the honest act is to clamp the target to `enqueue`
 *     and say so, never to burn the bound and then report a residual
 *
 * 🔴 .note = this file once REFUSED a self-say outright, on two mechanisms it called
 *   `nature`. both were wrong, and the refutation was already on disk in this same wish:
 *
 *   1. the claimed RELEASE deadlock — *"the poll waits for a transcript rise that is
 *      impossible while it waits"*. refuted: the brain writes each user turn to the jsonl
 *      **the moment it is submitted**, client-side, before any reply
 *      (`getCloneSubmittedCount.ts:12-14`, measured against a live peer 2026-09-18 at
 *      678ms). the rise never waited on a brain turn, so no deadlock reached it
 *   2. the claimed BASELINE collision — *"the caller's own screen already renders the
 *      `clone say --what <message>` tool call, so no post-read can part the echo from the
 *      dispatch"*. refuted by the rise rule it cited: a baseline that already HOLDS the
 *      text is exactly the case a count parts and a boolean cannot
 *      (`getCloneSubmittedCount.ts:15-17`). a pre-write count of 1 that ticks to 2 is as
 *      observable as 0 → 1
 *
 *   the one measurement behind the refusal (2026-09-17: 48 cycles, `absent`) is
 *   confounded with a SEPARATE named defect — a clone that adopts its parent's live
 *   transcript by mtime, so its count reads a file that never gains its turns
 *   (`.dream/2026_09_16.a-clone-adopts-its-parents-live-transcript-via-mtime.dream.md`,
 *   which the retired invariant's own scope table listed as a near neighbour)
 *
 * .note = the caller serial is read from the clone env at the boundary and passed in,
 *   so this stays pure and unit-clampable. an ABSENT caller serial means "no clone
 *   issued this say at all" — never a self-say, whatever the target
 */
export const isCloneSayToSelf = (input: {
  /**
   * the serial of the clone the address resolved to
   */
  targetSerial: string;

  /**
   * the serial of the clone that ISSUED the say, or null when a non-clone issued it
   */
  callerSerial: string | null;
}): boolean =>
  input.callerSerial !== null && input.callerSerial === input.targetSerial;
