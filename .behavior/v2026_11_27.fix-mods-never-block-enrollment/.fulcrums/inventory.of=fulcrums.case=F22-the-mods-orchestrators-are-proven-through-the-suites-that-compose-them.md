# F22 — the new mods orchestrators are proven through the suites that compose them

- **fork**: seven new orchestrators have no suite of their own: `getAllRoleModHookCommands`, `assertRoleKindDirsLinksOnly`, `assertRoleModAppliable`, `getAllRoleModFaultsUncarried`, `getAllRoleModFaultsOfRepo`, `isRepoSweepArmedByMods`, `getAllRoleFilesToRead`.
  - raised by 5.3 peer `mech-external-contracts` nitpick.2, under `rule.require.test-coverage-by-grain` (a nitpick where absent).
  - The options:
    - (a) one integration suite per orchestrator, with its own temp-dir fixtures
    - (b) hold each through the integration and blackbox suites that compose it, which already pin each arm on real disk
- **taken**: (b), for this round.
  - each orchestrator is reached by a real-disk suite of the next grain up, read off the callers:
    - `getAllRoleModFaultsOfRepo` and every arm it owns: the stop hold per class C0–C13 in `enroll.mods.integration` case8, plus `roles.mods.acceptance` case16, case18.x
    - `assertRoleModAppliable`, `getAllRoleModHookCommands`, `assertRoleKindDirsLinksOnly`: `syncRoleModdedViews.integration` (C9 hook skill, C10) and the same stop cases
    - `getAllRoleModFaultsUncarried`: `setBrainDirBoot.integration` and `enroll.mods` case13
    - `isRepoSweepArmedByMods`: `getAllRepoThisRolesWithHooks.integration` and `getLinkedRolesWithHooks.integration` case8
    - `getAllRoleFilesToRead`: `getOneRoleBootContent.integration` and `setBrainDirBoot.integration`
  - a direct suite per orchestrator would re-build the same fixtures to re-prove the same arms; the grain rule grades the absence a nitpick, and no arm is unproven.
- **rework**: clean. Add a `*.integration.test.ts` beside each, first `getAllRoleModFaultsOfRepo`, the source of the stop hold.
- **confidence**: 75%. A reader who wants each arm failure to point at its own file, not a blackbox case, would take (a).
- **where**: `src/domain.operations/mods/`, `src/domain.operations/boot/getAllRoleFilesToRead.ts`
- **raised by**: 5.3 peer review r3, nitpick.2
