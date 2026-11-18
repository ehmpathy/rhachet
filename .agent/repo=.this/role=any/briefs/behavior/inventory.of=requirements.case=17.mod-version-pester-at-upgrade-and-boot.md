# requirement: a pinned mod pesters at the upgrade, the boot, and the stop once its role moves off the pin

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- an `of: <repo>/<role>@<version>` opts into the pester; no `@version`, no pester
- once the installed role differs from the pin, `rhx upgrade` names the role, both versions, each mod
  file to re-read, and the fix (`set of: <role>@<installed>`), and exits 0
- each boot of the role names the drift in its mod notice (`@<pin> (installed <version>)`)
- every session stop in the repo holds (exit 2) while a pin has drifted, and names the role, both
  versions, each mod file to re-read, and the fix, as a boot budget breach holds it
- the pin moved to the installed version clears the notice and the hold

.amended 2026-11-09 by the director (seed S9, fulcrum F23 (b)): the pester moved off the stop, to
`roles boot` and `rhx upgrade`.
.amended 2026-11-17 by the commander (seed S11, fulcrum F23 reversed to (a)): the stop carries the
pester again — it holds like a boot budget breach, so a clone that never boots the role still learns.

## .clamp

- `src/domain.operations/mods/getAllRoleModDriftsOfRepo.ts` — the drifts
- `src/domain.operations/mods/asRoleModDriftReadout.ts` — the upgrade readout
- `src/domain.operations/mods/asRoleModDriftHookReadout.ts` — the stop hold readout
- `src/contract/cli/invokeRolesCost.ts` — the stop arm holds on a drift
- `src/domain.operations/mods/assertRoleModdedViewFresh.ts` — the boot notice label

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/asRoleModDriftReadout.test.ts`, `asRoleModDriftHookReadout.test.ts` | ✅ green 2026-11-17 |
| integration | `src/domain.operations/mods/syncRoleModdedViews.integration.test.ts` `[case2]` (the drift) | ✅ green 2026-11-09 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case1]` `[t3]` (the stop holds on the drift), `[t4]` (the pin moved, the notice drops the drift), `[t5]` (the stop is clear and silent) | ✅ green 2026-11-17 |
| acceptance | `blackbox/cli/init.mods.acceptance.test.ts` `[case1]` `[t0]` (the stop sweep holds on the fixture's drift) | ✅ green 2026-11-17 |
| acceptance | `blackbox/cli/upgrade.mods.acceptance.test.ts` `[case1]` (the upgrade exits 0, and prints the drift) | ✅ green 2026-11-17 |

status: proven

## .source

F4 of `.behavior/v2026_10_16.feat-role-edit-overlay`; F23 (b) moved the pester off the stop, and its
reversal to (a) put it back — the pester lives in the upgrade, the boot, and the stop.
