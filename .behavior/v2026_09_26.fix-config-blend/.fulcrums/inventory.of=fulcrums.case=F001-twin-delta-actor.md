# fulcrum F001 — a delta actor whose delta goes moot

## .the concern

`enroll-impl-arch-defects` blocker.1 (r011, i001): `setDeltaActorsOndisk` can leave a hash actor
that holds exactly the ambient roleset — a "twin" of the repo actor, which seed 9 forbids. the
reviewer asks that such an actor be retired or merged into the repo actor.

## .the facts, measured against the code

- the sync does not create the state. in the reviewer's own example (a `-driver` actor, then
  `rhx init --roles -driver`), the re-derived roles equal the roles the actor already holds, so the
  sync returns before any write. the ambient set moved under an actor whose delta is now moot
- the clamp that seed 9 rests on still holds: no enroll mints a new hash dir for the ambient set.
  the next `-driver` enroll ranks the ambient set first and lands on `repo=ambient`
  (`getOneActorOndiskExid` `[case7]`; `setDeltaActorsOndisk.integration.test.ts` `[case2]` `[t1]`)
- a delta actor is identified by its delta (`genEnrollmentHashOfDelta`), not by its roles — the same
  as a derived actor `slug=base._.delta=$h`. if the repo regains the role, the actor differs again
- its dir holds its clones' identity and history. to retire or merge it would orphan live clones

## .why it is fine to continue

the state is reachable only by a moot delta, harms no clone (each still reads the right roles), and
no new enroll can add to it. a retire or a merge is an identity decision with a clone-orphan cost,
so it belongs to the wisher, not to the driver. it is already recorded as an open question in the
5.1 yield and the blocker (seed 24 vs seed 9).

## .what the council decides

whether a delta actor whose roles come to equal the ambient set should:

1. stay as is (the current behavior, now tested and documented), or
2. retire once it has no live clone, or
3. merge into the repo actor (clones relinked)
