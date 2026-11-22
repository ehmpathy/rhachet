# F12 — `isRepoStopSweepArmed` is clamped at the contract grain, with no test of its own

- **fork**: add an integration test for `isRepoStopSweepArmed`, or rely on the clamps that read its verdict
- **taken**: rely on the clamps
- **why**: the operation is one line over `getAllRepoThisRolesWithHooks`, the reader the hook sync already tests. both of its states are pinned where they reach a human: unarmed in the birth clamp `[case1..3]` and the roster receipts (snapped), armed in the birth clamp `[case7]` (a `.this` budget) and the `init` rerender (whose boot guard findsert arms the repo). a third test would assert the delegate, not a behavior
- **rework**: clean. one integration file with two givens
- **confidence**: 75%
- **where**: peer review r8 nitpick.1
- **verdict**: open
