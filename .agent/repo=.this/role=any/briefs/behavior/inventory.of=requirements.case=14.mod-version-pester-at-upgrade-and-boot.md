# requirement: a pinned mod pesters at the upgrade and the boot once its role moves off the pin

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- an `of: <repo>/<role>@<version>` opts into the pester; no `@version`, no pester
- once the installed role differs from the pin, `rhx upgrade` names the role, both versions, each mod
  file to re-read, and the fix (`set of: <role>@<installed>`), and exits 0
- each boot of the role names the drift in its mod notice (`@<pin> (installed <version>)`)
- no session stop carries the pester: a mod arms no stop hook
- the pin moved to the installed version clears the notice

.amended 2026-11-09 by the director (seed S9, fulcrum F23 (b)): the pester moved off the stop, to
`roles boot` and `rhx upgrade`. the stop-held clause is withdrawn.

## .clamp

- `src/domain.operations/mods/getAllRoleModDriftsOfRepo.ts` — the drifts
- `src/domain.operations/mods/asRoleModDriftReadout.ts` — the upgrade readout
- `src/domain.operations/mods/assertRoleModdedViewFresh.ts` — the boot notice label

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/asRoleModDriftReadout.test.ts` | ✅ green 2026-11-09 |
| integration | `src/domain.operations/mods/syncRoleModdedViews.integration.test.ts` `[case2]` (the drift) | ✅ green 2026-11-09 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case1]` `[t3]` (the stop is silent), `[t4]` (the pin moved, the notice drops the drift) | ✅ green 2026-11-09 |
| acceptance | `blackbox/cli/upgrade.mods.acceptance.test.ts` `[case1]` (the upgrade exits 0, and prints the drift) | ✅ green 2026-11-09 |

status: proven

## .source

F4 of `.behavior/v2026_10_16.feat-role-edit-overlay`, superseded by F23 (b) — the pester lives in the
upgrade and the boot, never the stop.
