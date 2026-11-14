# requirement: a mod out of scope is refused — its files, its mode, and its `of:`

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- a mod file outside `briefs/` and `skills/` (a readme, an init, a hook, a keyrack) is refused
- a mod in a mode other than its role's (simple vs subject) is refused; a subject mod names only the
  subjects its role declares
- a mod `boot.yml` that declares a key its role owns (`budget:`, `inherit:`) is refused
- `of:` is required. a bare `of: <role>` that two linked repos ship is refused, and names each
  `repo/role` to pin. an `of:` no linked role matches is refused, and named at render. an `of:` of a
  `.this` role is refused: edit it in place

## .clamp

- `src/domain.operations/mods/parseRoleModBootYaml.ts`
- `src/domain.operations/mods/assertRoleModModeMatchesRole.ts`
- `src/domain.operations/mods/asRoleModTargetFromOf.ts`, `getOneRoleModTargetLinked.ts`
- `src/domain.operations/mods/computeRoleModPlan.ts` — a file the plan cannot place

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/parseRoleModBootYaml.test.ts` `[case3]`, `[case4]` | ✅ green |
| unit | `src/domain.operations/mods/assertRoleModModeMatchesRole.test.ts` | ✅ green |
| unit | `src/domain.operations/mods/asRoleModTargetFromOf.test.ts`, `getOneRoleModTargetLinked.test.ts` | ✅ green |
| unit | `src/domain.operations/mods/computeRoleModPlan.test.ts` `[case3]` | ✅ green |
| integration | `src/domain.operations/mods/syncRoleModdedViews.integration.test.ts` `[case10]` (an unplaced `of:`) | ✅ green |
| integration | `blackbox/cli/enroll.mods.integration.test.ts` `[case2]`–`[case5]` (absent, unlinked, `.this`, ambiguous then pinned) | ✅ green 2026-11-07 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case11.1]`–`[case11.3]` (`budget:`, a non-spec `of:`, a mode mismatch; each snapped) | ✅ green 2026-11-07 |

status: proven

## .source

F5 (S1), F12 and F18 of `.behavior/v2026_10_16.feat-role-edit-overlay`.
