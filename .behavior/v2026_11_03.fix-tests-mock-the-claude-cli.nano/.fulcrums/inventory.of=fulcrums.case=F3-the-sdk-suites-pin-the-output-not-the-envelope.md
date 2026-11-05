# F3 — the sdk suites pin the output, not the envelope

## .the fork

- (a) snapshot the full `BrainOutput` (output, metrics, episode, series) on each positive path of
  the `src/contract/sdk/genActor.brain.case*` suites
- (b) pin `result.output` with an exact `toEqual`, plus the call record; leave the envelope to the
  tests of the code that builds it

## .taken

(b). with a mocked brain the envelope is fixture data: `metrics` comes from
`genMockedBrainOutputMetrics`, and `episode` / `series` from `genBrainContinuables`, which has its
own suites (`brainRepl.continuation.test.ts`, `brainAtom.continuation.test.ts`). a snapshot here
would pin the fixture, not the sdk contract, and churn on any fixture change. the caller-faced
error paths are snapshotted (`actorAsk [case2] [case3]`, `actorAct [case2]`).

the envelope is pinned once, at the caller's surface. the `invokeAct` default-brain case snaps the
full `rhx act` stdout: the run header, then the whole `BrainOutput` json with its output, calls,
metrics, episode and series. a caller who reads the envelope reads it there, and a drift in its
shape or key order shows in the pr diff. the sdk suites keep the exact `toEqual` on `.output`.

## .rework

clean. a `toMatchSnapshot()` per positive path can be added at any time.

## .confidence

88%. the residue: a reviewer may want the key order of the envelope visible in a pr diff.

## .where

ergo-friction-hazards lane, 5.1 i001 r009, nitpick.1.

## .verdict

(open)
