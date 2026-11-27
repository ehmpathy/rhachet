# F17 — a `.this` spec that will not parse arms the stop sweep

- **fork**: at the hook sync, treat a `.this` `boot.yml` that will not parse as armed (it may declare a budget), as unarmed, or keep it a sync error
- **taken**: armed, with no sync error
- **why**: the sync error exited `rhx init` 1, which halts the remedy path (vision row 12), so it is out. unarmed reads an unknown budget as an absent one. `rhx init` seeds the budget in `role=any`, so `role=any` is most repos' only carrier; one broken file there would turn off the budget gate, the mod-drift gate, and the hold on the spec itself, for the whole repo, with no hold to say so. armed keeps the arm the author declared, and the stop holds on the spec until it parses (vision row 7)
- **counter (F6)**: a content defect must not arm the hook
- **answer**: F6 forbids a defect that ARMS a repo that declared no arm. a broken carrier declared one, and the defect would RETRACT it. an unknown budget is read as the arm it most likely is; a spec with no budget that will not parse arms one stop sweep that holds on it, and a repair releases it
- **reversed**: i005, after r10 blocker.3 and r11 blocker.1 each ran a broken `role=any/boot.yml` with `budget: 5_000` and saw the receipt report "no stop sweep is armed"
- **rework**: clean. one branch in `getAllRepoThisRolesWithHooks`
- **confidence**: 85%
- **where**: found by the per-kind `[case8]` rerender clamp, i004; reversed at i005
- **verdict**: reversed
