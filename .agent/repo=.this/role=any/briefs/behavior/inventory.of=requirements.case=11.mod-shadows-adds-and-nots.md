# requirement: a mod shadows, adds, and nots the files of a role it consumes

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

a repo changes a role it consumes with no release of the role's package. a mod lives at
`.agent/repo=.mods/role=<role>/`, and the next render shows every clone the modded role:

- **shadow** — a mod file at a path the role holds renders in place of the published file
- **add** — a mod file at a path the role lacks renders beside the published files, once a `say` or
  `ref` glob of the mod's `boot.yml` names it
- **not** — a `not` glob of the mod's `boot.yml` removes each held path it matches
- the key is the path relative to the role dir (`briefs/…`, `skills/…`); the rest of the role renders
  as published
- a mod of a subject-mode role does the same under `always:` and `subject.<slug>:`

## .clamp

- `src/domain.operations/mods/computeRoleModPlan.ts` — the plan: shadows, adds, nots
- `src/domain.operations/mods/setRoleModdedView.ts` — the view: `briefs/` and `skills/` as real dirs of
  per-file links
- `src/domain.operations/mods/syncRoleModdedViews.ts` — the one sync every render path calls

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/computeRoleModPlan.test.ts` `[case1]` | ✅ green |
| integration | `src/domain.operations/mods/syncRoleModdedViews.integration.test.ts` `[case2]` | ✅ green |
| integration | `src/domain.operations/mods/setRoleModdedView.integration.test.ts` `[case1]` | ✅ green 2026-11-07 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case1]`, `[case9.2]` (a glob that adds three) | ✅ green 2026-11-07 |
| integration | `blackbox/cli/roles.mods.subject.integration.test.ts` `[case1]`, `[case2]` (subject mode) | ✅ green 2026-11-07 |

status: proven

## .source

the wish of `.behavior/v2026_10_16.feat-role-edit-overlay` (0.wish.md), 2026-10-16.
