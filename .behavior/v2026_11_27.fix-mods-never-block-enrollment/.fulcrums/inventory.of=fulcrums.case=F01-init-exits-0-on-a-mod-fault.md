# F01 — `rhx init` exits 0 on a mod fault, not 2

- **fork**: init renders every actor, then (a) exits 2 on a refused mod, as usecase 12 holds today · (b) exits 0 and prints the skip readout
- **taken**: (b). `prepare:rhachet` runs init on every `pnpm install`; an exit 2 fails the install, which blocks a director tree as surely as a refused enroll. the fault is still pestered at each boot and each stop
- **mechanism**: init's exit 2 is `asExitCodeForBrainDirSyncFailures` over each actor whose render threw (`syncAndReportBrainDirBoots.ts:131-136`). once the gate returns `skipped` in place of a throw, no failure row arises, so (b) needs no new branch: it falls out of the gate. (a) would need one — a new failure row per skipped mod
- **rework**: clean — to restore (a), add the skipped mods to the failure rows
- **confidence**: 80%. the wish names enroll, resume, and boot; init is reached by inference from "every boot through it" and the install path
- **verdict**: (b) confirmed by the director at the 1.vision approval, 2026-11-27 (seed S01)
- **where**: `src/domain.operations/init/boots/syncAndReportBrainDirBoots.ts:131-136`, `blackbox/cli/init.mods.acceptance.test.ts` case2
