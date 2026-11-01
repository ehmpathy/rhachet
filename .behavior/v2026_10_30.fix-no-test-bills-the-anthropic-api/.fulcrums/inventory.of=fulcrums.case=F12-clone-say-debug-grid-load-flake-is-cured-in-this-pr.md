# F12 — the `clone.say.delivered` [case13b] load flake is cured in this PR

## .the fork
- (a) cite it as a diagnosed load flake in the clone domain; leave the suite as it is
- (b) cure it here, by a widened assertion: accept the named blind read as a legal outcome
- (c) cure it here, by a retried sample: say again until a capable read lands, and hold that read to the strict clamp

## .taken
(c). the stone's zero-flake bar forbids a flake left live, and (c) is the one cure that keeps the clamp.

the cause, from the capture of the red run (log `2026-10-31T22-55-01Z`):
- the baseline probe was `capable`
- the first post-dispatch probe timed out under load and degraded to `probe=unsupported reason=feed-not-live` (the transport-fault degrade in `getCloneInputStateOrBlind`)
- the transcript rose on that same cycle, so the say released on a blind read

the product held its contract: a `released` verdict proven by the transcript, and a debug record that names the blind read. the AFTER grid is by contract the read the verdict was decided on, never a later re-probe, so no product change is owed.

the defect was the test: it pinned one say's probe capability, which host load can deny. the cure is the precedent of [case13]'s observe poll and `clone.screen-dogfood`: [case13b] says up to three times, each try with its own needle, until a try's AFTER section holds a capable read. that read must carry its own needle inside a `│…│` row, the same strict assertion the case held before this PR. a try that read blind must have released and must show no grid. three blind tries in a row fail loud.

## .why not (b)
(b) let a build that emits only blind reads pass the success case, which removes the success-path grid proof. two peer lanes (r2 and r12, round i004) named that as a loosened intent, and they were right.

## .rework
clean: one `when` in `blackbox/cli/clone.say.delivered.acceptance.test.ts` [case13b].

## .confidence = 95%
the strict clamp is back, and the retry is the pattern this suite already uses for the same race.

## .where
`blackbox/cli/clone.say.delivered.acceptance.test.ts` [case13b] [t0]; `5.3.verification.yield.md`, the tests table.

## .verdict
reversed at 5.3 from the first best-guess (a) by the zero-flake bar; then moved from (b) to (c) by the i004 peer round.
