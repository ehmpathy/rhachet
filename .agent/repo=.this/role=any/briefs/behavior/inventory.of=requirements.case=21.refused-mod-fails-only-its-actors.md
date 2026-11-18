# requirement: a refused mod fails only the actors that carry its role

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- `rhx init` renders every actor, then exits 2 and names each refused mod; a role no mod names stays
  linked and boots
- a boot of the modded role raises the refusal again (exit 2)
- `rhx enroll` of an actor that carries the role is refused; an enroll without the role succeeds

## .clamp

- `src/domain.operations/mods/syncRoleModdedViews.ts` — a refusal is returned per role, never thrown
- `src/contract/cli/invokeInit.ts`, `src/contract/cli/invokeEnroll.ts` — the render raises it per actor

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/mods/syncRoleModdedViews.integration.test.ts` `[case5]`, `[case11]` | ✅ green |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case5]` | ✅ green |
| acceptance | `blackbox/cli/init.mods.acceptance.test.ts` `[case2]` | ✅ green 2026-11-07 |
| integration | `blackbox/cli/enroll.mods.integration.test.ts` `[case2]` `[t1]` (an enroll without the role) | ✅ green 2026-11-07 |

status: proven

## .source

F13 of `.behavior/v2026_10_16.feat-role-edit-overlay` (usecase 12).
