# F15 · the two new spawn cases tear down their pty as the file's other six do

## .the fork

- **a.** `await spawn?.dispose().catch(() => undefined)` in `afterAll`, as the six extant cases of
  `genCloneOndisk.integration.test.ts` do
- **b.** let a dispose rejection fail the suite

## .taken = a

the teardown runs after every assertion has reported; a dispose rejection there says the pty was
already gone, which fails no claim the case makes. a leaked pty is caught by jest's open-handle
watch, not by this catch. a fork of the convention in two cases of eight leaves the file with two
teardown rules; a sweep of all eight is a test-infra change out of this pr's scope.

## .rework = clean

drop the catch in two `afterAll` blocks.

## .confidence = 75%, why

the catch has no allowlist, which `rule.forbid.failhide` grades; the doubt is whether teardown is in
its scope.

## .where

`src/domain.operations/clone/genCloneOndisk.integration.test.ts`. answers r2.nitpick.2.

## .verdict

owed — a council rules at the close.
