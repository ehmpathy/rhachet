# F20 — compaction critipaths and a playtest

## .fork

an earlier draft sent three compaction critipaths to `5.5.playtest`, on the claim that no harness
could force a compaction. a playtest guards no regression. accept, build, or defer?

## .verdict — RESOLVED: the role cell is automated; the adhoc cells left scope

| cell | now |
|---|---|
| the role corpus survives a compaction | journey [t4]: a live pty clone, `/compact` sent through the pty, then `sayAndPollForMarker` for the changed sentinel — an acceptance test, real haiku |
| the adhoc corpus survives a compaction (attended · unattended) | the adhoc path belongs to the peer branch (F13) |

## .grounds

- the claim *"no harness can force a compaction"* was an unmeasured absence. a pty clone takes typed
  input, so `/compact` can be sent the way a human sends it; `sayAndPollForMarker` already drives a
  real pty clone, from the shared `blackbox/.test/infra/enrollCloneHarness` (used by
  `clone.joker.realbrain.acceptance.test.ts`); the journey reuses it.
- ⚠️ that `/compact` typed into the pty compacts is proven at [t4], not before. if it does not, the
  cell falls back to a playtest and this entry reopens.
- the adhoc cells have no subject in this tree; they ship with the branch that owns the adhoc emit.

## .where

- criteria usecase.5 · journey [t4] · F13
