# F003 — arch-defects round 6: a tallied blocker with no body, and the teardown key

## .the concerns

1. `enroll-impl-arch-defects` i006 tallies **2 blockers**, but its review body states **one**
   blocker (the twice-written cwd guard) and two nitpicks. there is no second blocker in the text.
2. its nitpick.1 asks that `globalTeardown: 'test-fns/autoprune.teardown.jest'` be unified into a
   shared module, as the globalSetup was.

## .why it is fine to continue

1. ⚠️ correction to this entry: the route's ordinals show the reviewer tallied ONE nitpick, so its
   `blocker.2` is most likely the item its body labels "nitpick — the barrel never exports the
   new infra". that item IS repaired (`src/.test/infra/index.ts` now exports the new infra).
   this dispute was declared before that was clear, and a stance is final for its given — so the
   record here states plainly: blocker.2 is repaired, not refuted. the council may read it as a
   concession.
2. the teardown key is a pointer to test-fns' own export — no logic sits in rhachet to drift — and
   clamp `[case2]` asserts the value is identical in all three configs. the globalSetup was
   unified because it held logic (an order, a bound); the teardown holds none.

## .what would change the call

a second blocker stated in a later round; or rhachet logic added to the teardown path.

## .rework

clean — the barrel export is in; a teardown wrapper would be one forward file.

## .verdict

settled by the driver, by reason: blocker.2 is repaired (barrel exports land), and the teardown
key holds as a pointer with no logic to drift. the lane's next round (i007) approved with 0
blockers. no human call owed.
