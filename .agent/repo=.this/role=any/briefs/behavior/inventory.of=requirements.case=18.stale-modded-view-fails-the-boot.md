# requirement: a stale modded view fails the boot loud and names `rhx init --hooks`

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- a mod file added, removed, or renamed after the last render, a mod added with no render, or a mod
  dir removed with no render each make the view stale
- a boot of a stale view exits 2, names why and the paths, and names `rhx init --hooks`
- the boot writes no file: it never heals the view
- an edit of an extant shadow's content needs no render — the link reads it live
- `rhx roles cost --all` reports a stale row, never refuses

.amended 2026-11-09 by the director (seed S9, fulcrum F23 (b)): the stop-held clause is withdrawn; a
stale view is caught at the boot alone.

## .clamp

- `src/domain.operations/mods/assertRoleModdedViewFresh.ts` — the check, `RoleModViewStaleError`

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/mods/assertRoleModdedViewFresh.integration.test.ts` `[case1]`–`[case6]` | ✅ green 2026-11-09 |
| integration | `src/domain.operations/mods/syncRoleModdedViews.integration.test.ts` `[case3]`, `[case4]` | ✅ green 2026-11-09 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case2]` `[t0]`, `[t0.1]` | ✅ green 2026-11-09 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case2]` `[t0.2]` (the stop is silent), `[case7]` (a content edit) | ✅ green 2026-11-09 |

status: proven

## .source

F14 of `.behavior/v2026_10_16.feat-role-edit-overlay` (Q3), ruled by the director.
