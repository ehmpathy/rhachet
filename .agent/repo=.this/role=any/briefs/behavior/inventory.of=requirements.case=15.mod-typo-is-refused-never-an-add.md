# requirement: a typo in a mod is refused, never read as an add or a quiet no-op

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- a mod file at a path the role does not hold, and that no `say` / `ref` glob names, is refused —
  never rendered as an add. the refusal names the nearest held path
- a `not` that matches no held file is refused, and names the nearest held path
- a fixed typo plus `rhx init --hooks` renders the mod as meant

## .clamp

- `src/domain.operations/mods/computeRoleModPlan.ts` — an unplaceable file and an empty `not` each
  refuse the plan

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/computeRoleModPlan.test.ts` `[case3]`, `[case4]` | ✅ green |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case5]` (a typo file) | ✅ green |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case8]` (a typo `not`, then the fix) | ✅ green 2026-11-07 |

status: proven

## .source

the wish of `.behavior/v2026_10_16.feat-role-edit-overlay`, 2026-10-16: *a typo must not silently
turn an overwrite into an extension*.
