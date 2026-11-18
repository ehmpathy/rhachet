# requirement: a `.md.min` rides with its `.md` in a mod

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- a shadow of a brief drops the published `.md.min`, and the notice names the drop
- a mod that ships its own `.md.min` beside its shadow renders the mod's minified form; the notice
  claims no drop
- a mod `.md.min` with no `.md` beside it, in the mod or the role, is refused as an orphan

## .clamp

- `src/domain.operations/mods/computeRoleModPlan.ts`, `asBriefPathLessMin.ts`

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/computeRoleModPlan.test.ts` `[case2]` | ✅ green |
| unit | `src/domain.operations/mods/asBriefPathLessMin.test.ts` | ✅ green |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case1]` `[t1]` (the drop) | ✅ green |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case9]`, `[case9.1]` | ✅ green 2026-11-07 |

status: proven

## .source

the r010 review of `5.1.execution.from_vision`, `.behavior/v2026_10_16.feat-role-edit-overlay`.
