# requirement: a shadow skill runs beside its published peers

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- a shadow skill runs in place of the published skill
- a shadow skill that sources a published peer (`source "$dir/peer.sh"`) finds it in the view
- a published skill that sources a peer the mod shadows reads the modded peer

## .clamp

- `src/domain.operations/mods/setRoleModdedView.ts` — one merged dir of per-file links per kind

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/mods/setRoleModdedView.integration.test.ts` `[case1]` | ✅ green 2026-11-07 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case4]`, `[case4.1]` | ✅ green |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case4.0.1]` | ✅ green 2026-11-07 |

status: proven

## .source

F8 of `.behavior/v2026_10_16.feat-role-edit-overlay`, ruled by the director.
