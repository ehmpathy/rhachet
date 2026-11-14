# requirement: `roles cost` marks a modded role, and a mod alone arms no stop hook

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- `rhx roles cost --all` marks each modded role row `[~] modded · N shadow · N add · N not`, and that
  row alone; a modded role with no row is named in a `.agent/repo=.mods` block
- a mod alone arms no stop hook: a repo whose only `.this`-side content is a mod gets no
  `roles cost --all --when hook.onStop` entry in its actors' settings

.amended 2026-11-09 by the director (seed S9, fulcrum F23 (b)): the stop-sweep half is reversed. the
framework-owned-hooks rule holds unamended.

## .clamp

- `src/domain.operations/mods/asRoleModCostTag.ts`, `asRoleModsUncostedReadout.ts`
- `src/domain.operations/brains/getAllRepoThisRolesWithHooks.ts` — carries the `.this` budget alone

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/asRoleModCostTag.test.ts`, `asRoleModsUncostedReadout.test.ts` | ✅ green 2026-11-09 |
| integration | `src/domain.operations/brains/getAllRepoThisRolesWithHooks.integration.test.ts` `[case8]` (a mod alone arms naught), `[case9]` | ✅ green 2026-11-09 |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case1]` `[t2]`, `[case10]` (one mark among two roles) | ✅ green 2026-11-09 |
| acceptance | `blackbox/cli/init.mods.acceptance.test.ts` `[case1]` `[t1]` (`settings.of.repo.json` holds no `repo=.mods` entry) | ✅ green 2026-11-09 |

status: proven

## .source

F6 and F23 of `.behavior/v2026_10_16.feat-role-edit-overlay`.
