# requirement: `roles cost` marks a modded role, and a mod arms the one stop sweep

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- `rhx roles cost --all` marks each modded role row `[~] modded · N shadow · N add · N not`, and that
  row alone; a modded role with no row is named in a `.agent/repo=.mods` block
- a mod arms the repo-wide stop sweep: a repo with a `.agent/repo=.mods/role=*` dir gets one
  `roles cost --all --when hook.onStop` entry in its actors' settings, authored by a `.this` role
  (the first budgeted one, else `role=any`), never by `repo=.mods`
- the sweep is armed once per repo: a mod beside a budgeted `.this` role adds no second entry, and a
  mods dir that holds no `role=*` dir arms naught

.amended 2026-11-09 by the director (seed S9, fulcrum F23 (b)): the stop-sweep half is reversed.
.amended 2026-11-17 by the commander (seed S11, fulcrum F23 reversed to (a)): a mod arms the stop
sweep, so a drifted pin holds the stop as a boot budget breach does. the framework-owned-hooks rule
names the mod pin as the sweep's second arm.

## .clamp

- `src/domain.operations/mods/asRoleModCostTag.ts`, `asRoleModsUncostedReadout.ts`
- `src/domain.operations/brains/getAllRepoThisRolesWithHooks.ts` — carries the one sweep, for a
  budget or a mod

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/asRoleModCostTag.test.ts`, `asRoleModsUncostedReadout.test.ts` | ✅ green 2026-11-09 |
| integration | `src/domain.operations/brains/getAllRepoThisRolesWithHooks.integration.test.ts` `[case8]` (mods arm one sweep, under `role=any`), `[case8.1]` (no `.this` dir), `[case8.2]` (a stray arms naught), `[case9]` (one sweep beside a budget) | ✅ green 2026-11-17 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case1]` `[t2]`, `[case10]` (one mark among two roles), `[case3]` `[t0.0]` (a deleted mod disarms the sweep) | ✅ green 2026-11-17 |
| acceptance | `blackbox/cli/init.mods.acceptance.test.ts` `[case1]` `[t1]` (`settings.of.repo.json` holds one sweep, authored by `repo=.this/role=any`, and no `repo=.mods` entry) | ✅ green 2026-11-17 |

status: proven

## .source

F6 and F23 of `.behavior/v2026_10_16.feat-role-edit-overlay`.
