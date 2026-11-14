# requirement: a deleted mod returns the role to its published layout

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- delete `.agent/repo=.mods/role=<role>/` and render: the role dir is the published layout again, and
  its view record is gone
- the next boot and the next enroll carry no notice, no tag, and every not-ed file back

## .clamp

- `src/domain.operations/mods/setRoleUnmoddedView.ts`, `syncRoleModdedViews.ts`

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/mods/syncRoleModdedViews.integration.test.ts` `[case4]` | ✅ green |
| integration | `src/domain.operations/mods/setRoleUnmoddedView.integration.test.ts` `[case1]` | ✅ green |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case3]` | ✅ green |
| integration | `blackbox/cli/enroll.mods.integration.test.ts` `[case6]` | ✅ green 2026-11-07 |

status: proven

## .source

the vision of `.behavior/v2026_10_16.feat-role-edit-overlay` (usecase 7).
