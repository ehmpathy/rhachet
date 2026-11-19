# F33 · the openai stitch tests stay behind `BRAIN_LIVE_SCOPE=all`

## .the fork

- **a.** keep `invokeImagineStitcher.integration` and `enweaveOneStitcher.integration` behind
  `describeBrainLiveOnDemand`, so they run on the named flag
- **b.** run them on every integration pass, or enforce the flag run in ci, per r3.nitpick.1 (5.3, i001)

## .taken = a

- `rule.require.live-brain-tests-run-on-a-named-flag` is this repo's rule for a test that calls a
  live brain: it runs on a named flag, and a run without its key fails loud, never a silent skip
- the prior gate, `given.runIf(!process.env.CI)`, was a silent skip in ci; the move to the named flag
  is the cure that rule asks for, not a regression
- the tests still call the real service when the flag is set, so the rule's "at least one real test"
  clause holds

## .rework = clean

swap the wrapper back, or add a ci step with the flag; no contract moves.

## .confidence = 80%, why

whether ci should also carry a scheduled `BRAIN_LIVE_SCOPE=all` run is a cost call this pr does not
own; the gate itself follows the repo rule.

## .where

`src/domain.operations/stitch/invokeImagineStitcher.integration.test.ts`,
`src/domain.operations/weave/enweaveOneStitcher.integration.test.ts`. answers r3.nitpick.1 (5.3, i001).

## .verdict

owed — a council rules at the close.
