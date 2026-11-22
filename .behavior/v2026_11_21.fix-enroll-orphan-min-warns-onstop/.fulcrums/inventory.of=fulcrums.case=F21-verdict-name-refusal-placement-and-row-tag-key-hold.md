# F21 — the verdict name, the refusal placement, and the row tag key hold

- **fork**: rename `genOneRepoThisBootBudgetVerdict`, move `asRoleCostHookRefusal` into `domain.operations/boot`, and key `asRoleContentDefectRowTag` by `ref`; or keep all three
- **taken**: keep all three
- **why**
  - **name**: the content defects are a second reason the same stop verdict is not clean, on the same memo. a rename mints a new term (`StopVerdict`) for one concept the repo already names, and moves four files and their tests in a pr about content checks
  - **placement**: `asRoleCostHookRefusal` has one caller, `invokeRolesCost`, and shapes that caller's own exit. it sits beside its only caller (`rule.prefer.most-common-denominator`); it lifts once a second caller needs it
  - **row tag key**: a roster row is a boot spec by path. a route manifest row has no role ref at all, so a key by `ref` would need a second lookup from path to ref. the path prefix is the one key every row carries
- **counter (i004 r11)**: three nitpicks, one per item above
- **rework**: clean. each is a rename or a move with no caller outside this pr
- **confidence**: 80%
- **counter (5.3 i004 r11 nitpick.4)**: in a mixed hold the trailer names only the budget, and the defects ride in the json as a key with no hint
- **answer**: one hold, one refusal, chosen by the gravest drift (`asRoleCostHookRefusal`). the tree above the trailer prints the content readout in full, each row with its fix; the json `defects` key lists the same paths. a second hint would restate the rows
- **where**: peer review r11 nitpicks (i004); 5.3 i004 r11 nitpick.4
- **verdict**: open
