# F13 — `init` stands in for `upgrade` at the rerender clamp

- **fork**: add an acceptance given over `rhx upgrade` past a defect, or clamp the rerender through `init --hooks` alone
- **taken**: `init --hooks` alone
- **why**: every remedy command ends on one sweep. `syncAndReportBrainDirBoots` is the call at `execUpgrade.ts:398`, `invokeRolesLink.ts:50`, and `invokeInit.ts:338`, and the fix lives inside it, so `[case8]` exercises the one code path all three take. `upgrade` adds a package install ahead of that sweep, which pulls the network into a clamp of content checks and proves naught about them
- **rework**: clean. one acceptance given over `upgrade` against a local registry
- **confidence**: 80%
- **counter (5.3 i004 r10)**: `upgrade`'s own test mocks the shared receipt function, so a broken wire from `execUpgrade` to the sweep would pass; an offline `file:`-ref upgrade fixture exists in `upgrade.mods.acceptance.test.ts`
- **answer**: the wire is one call (`execUpgrade.ts:398`) to the function `[case8]` proves; the receipt is not upgrade's own output. a clamp over the wire is a fair addition, and stays clean to add
- **where**: peer review i002 r8 nitpick.2; 5.3 i004 r10 blocker.1
- **verdict**: open
