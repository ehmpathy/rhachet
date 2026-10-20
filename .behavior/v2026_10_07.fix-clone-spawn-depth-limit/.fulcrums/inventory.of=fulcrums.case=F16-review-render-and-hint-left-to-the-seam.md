# F16 — the `rhx review` render and the hint stay at the seam

## .the fork

a depth-1 reviewer whose `rhx review` is refused reads two things: the message rhachet throws, and
the frame bhrain's `review.js` wraps it in. two questions came up on 5.1 (r010 blocker.3, nitpick.2):

- **(a)** clamp the message at the seam that throws it, and leave the frame to bhrain
- **(b)** add a blackbox case here that installs bhrain, runs `rhx review` at depth 1, and snaps the frame
- **(c)** also split the hint per door, so a reviewer at the repl door reads "answer from your own read"
  where an enroll caller reads "ask the clone that spawned you"

## .taken, and why at the time

**(a)**, with the hint unchanged.

- the message is snapped twice already: `assertCloneSpawnDepthWithinLimit.test.ts` and
  `withCloneSpawnDepthScope.test.ts` [case3], and the real supplier's caller reads it in
  `replDoorRealSupplier.realnode.acceptance`, where `act` is asserted identical to `ask`
- the frame is bhrain's code (`review.js:384-392`, `asConstraintRefusalText.js`). a snap of it here
  would pin another repo's render in this repo's suite, and go red on a bhrain release that this pr
  did not touch. the frame's own test belongs in `rhachet-roles-bhrain`
- one hint serves every door because the refusal is one fact: the caller is at depth 1. the reviewer
  that reads "ask the clone that spawned you" still writes its verdict from its own read, as
  case=2's narrative sketches it — so a second hint would add a branch for no changed act

## .rework

clean. (b) is one new blackbox file; (c) is one more key on the metadata and one more snapshot row.

## .confidence — 75%, and why it is low

the reviewer is right that (b) would cost no tokens, since the refusal fires before any spawn. what
holds me at (a) is cross-repo churn, a judgment the council may weigh differently.

## .where

`src/domain.operations/spawn/assertCloneSpawnDepthWithinLimit.ts` (the hint) ·
`blackbox/sdk/replDoorRealSupplier.realnode.acceptance.test.ts` (the caller-side clamp)

## .verdict

open — for the council.
