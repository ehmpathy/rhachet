# F18 — the stop sweep is armed by the hook sync, so a first mod arms it at the next init

- **fork**:
  - (a) attach the stop sweep to every actor of every repo, mods or none, so a first mod added later is swept at once
  - (b) attach it where the hook sync finds mods; a first mod added after the last `rhx init` arms it at the next init
- **taken**: (b).
  - a mod is rendered by `rhx init` (and synced by enroll); the documented path to add a mod runs init, and init's hook sync arms the sweep
  - (a) adds a stop hook to every seat of every repo, mods or none, to cover a mod added with no init. that is a hook contract change for every adopter, past this route's wish
  - the boot still names a fault at each enroll, so a seat is told at boot whatever the arm
- **rework**: clean. One condition in `isRepoSweepArmedByMods` callers, plus the budget-only narrow.
- **confidence**: 70%. A human who drops a first mod in by hand and only re-enrolls gets the boot notice and no stop hold until the next init.
- **where**: `src/domain.operations/mods/isRepoSweepArmedByMods.ts`, `src/domain.operations/brains/getAllRepoThisRolesWithHooks.ts`
- **raised by**: i006 r010 nitpick 2 (enroll-impl-behavior-intent)
