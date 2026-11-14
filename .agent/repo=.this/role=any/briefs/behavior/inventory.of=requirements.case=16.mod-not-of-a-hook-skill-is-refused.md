# requirement: a `not` of a skill one of the role's hooks invokes is refused at render

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- a mod that nots a skill a role hook names (`rhx <skill>` or a path to the skill file) is refused,
  so no hook fails at its next event; the fix is to shadow the skill
- where the role package does not load, so no hook can be read, a skill `not` is refused, and the
  skill stays in the view
- a `not` of a skill no hook reaches renders

## .clamp

- `src/domain.operations/mods/assertRoleModNotsSpareHookSkills.ts`

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/assertRoleModNotsSpareHookSkills.test.ts` `[case1]`–`[case3]` | ✅ green |
| integration | `src/domain.operations/mods/syncRoleModdedViews.integration.test.ts` `[case7]` | ✅ green |
| integration | `blackbox/cli/roles.mods.subject.integration.test.ts` `[case1]` `[t1]` (a not-ed skill no hook reaches is gone) | ✅ green 2026-11-07 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case14]` (a hooked role's real package load: init and boot refuse, the skill still runs) | ✅ green 2026-11-07 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case13]` (a not-ed skill is not found by `rhx run`) | ✅ green 2026-11-07 |

status: proven

## .source

F10 and F16 of `.behavior/v2026_10_16.feat-role-edit-overlay`.
