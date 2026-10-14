# requirement: a clone loads no hook from a role it is not enrolled in, from any layer

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

🔴 core invariant. a clone runs the hooks of its own roles and of no other — summed over EVERY settings
layer the brain cli reads, never one file alone.

- `rhx enroll claude --roles -driver` boots no driver hook: not from the `--settings` file, not from the
  user layer (`settings.json`, which is the grove), not from a repo `.claude/settings.json` or
  `.claude/settings.local.json`
- a hook with no `author`, or an author with no `role=` segment, is the human's own and is allowed
- a layout that would break this does not spawn: enroll refuses before the brain starts, and names the
  leaked author and the layer it came from

why every layer: claude MERGES hooks across all the sources it reads. on v1.49.1 the spawn passed a
filtered `--settings` file while the user layer (the actor's real `settings.json`) still held every
linked role's hooks, so a `-driver` peer booted the driver's hooks and drove the human's route.

## .clamp

- `src/domain.operations/enroll/asBrainCliSpawnArgs.ts` — a clone spawns with `--setting-sources user`
  alone, plus `--settings <actor settings.of.repo.json>`, so no repo layer joins the merge
- `src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts` — the user layer is the grove arrow,
  never a file rhachet fills with role hooks
- `src/domain.operations/enroll/getSettingsForRoles.ts` — `settings.of.repo.json` is narrowed to the actor's
  roles, matched by whole `role=` segment (`asRoleSlugOfHookAuthor.ts`)
- 🔴 `src/domain.operations/enroll/assertCloneSettingsLayersHoldOnlyEnrolledRoles.ts` — the runtime
  guard, called by `invokeEnroll` on the exact argv it will spawn. it reads every layer that argv names
  (`getAllBrainCliSettingsLayers.ts`) and refuses on any hook a non-enrolled role authored
  (`getAllHooksOfUnenrolledRoles.ts`): a leak under the human's home is a `ConstraintError` (exit 2, fix
  the home settings); a leak in a file rhachet wrote is a `MalfunctionError`. enroll is the one path that
  spawns a clone, so the guard covers every clone

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/enroll/getAllBrainCliSettingsLayers.test.ts` — the enroll argv names the user layer and the actor's `settings.of.repo.json` alone; an argv with no `--setting-sources` reads all three | ✅ green 2026-10-13 |
| unit | `src/domain.operations/enroll/getAllHooksOfUnenrolledRoles.test.ts` — a driver hook is reported for a `-driver` clone; enrolled and authorless hooks are not; a prefix slug is matched by whole segment | ✅ green 2026-10-13 |
| integration | `src/domain.operations/enroll/assertCloneSettingsLayersHoldOnlyEnrolledRoles.integration.test.ts` [case1]–[case4] — clean passes; a repo-layer leak is a malfunction; a grove leak is a constraint; a repo `settings.local.json` is not read; with the role filter disabled, the clamp goes red | ✅ green 2026-10-13 |
| acceptance | `blackbox/cli/enroll.acceptance.test.ts` [case2e] [t0] — a real `-driver` enroll: no layer of the recorded spawn argv carries a driver hook; [t1] — a driver hook in the HOME grove makes enroll refuse with exit 2 before the brain spawns; with the role filter disabled, the clamp goes red | ✅ green 2026-10-13 |

## .source

the wisher, 2026-10-13, on `rhx enroll claude --roles -driver` that still booted the driver's hooks on
main: "thats a core invariant that we must have enforced and regression proof"
