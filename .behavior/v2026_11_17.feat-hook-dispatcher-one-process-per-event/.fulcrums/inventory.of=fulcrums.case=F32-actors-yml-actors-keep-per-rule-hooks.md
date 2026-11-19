# F32 — under `.agent/actors.yml`, actors keep per-rule hooks; the dispatcher serves the no-manifest layout

## .the fork

main gained `.agent/actors.yml` (#699) while this pr was open. under a manifest, the root hook sync
skips claude, and each actor's hooks are rendered in-mem from the linked roles
(`getAllHooksOfLinkedRolesForClaudeCode`), through `syncAllRoleHooksIntoEachBrainRepl` into a scratch
dir that is read back and removed. through the dispatch adapter, that render parks every rule in a
scratch manifest the read never sees, so each actor would boot with no role hooks at all.

- **(a)** under a manifest, render per rule (`hooksVia: 'brain'`) and skip the per-actor dispatch
  derive: every rule decides as on main, one process per rule
- **(b)** under a manifest, render the union into each actor's own dispatch manifest, so those
  actors get one dispatcher per event too

## .taken

(a). it holds every rule's verdict exactly as main, which is the wish's hard bound, and it is the
smaller change to two features that met at a rebase. the root sync writes no repo actor manifest
under `actors.yml`, so a dispatch derive there would read a stale one.

## .rework

clean. (b) is additive: the union render and the narrow already exist; the derive would write the
narrowed rules to the actor's manifest instead of its settings. caught as
`.dream/v2026_11_19.feat.hook-dispatch-under-actors-yml.md`.

## .confidence

90%. the cost is the process cut on `actors.yml` repos alone; no repo in this org declares one yet,
and the defect it avoids is a silent loss of every guard.

## .where

`src/domain.operations/enroll/genBrainCliConfigArtifact.ts` (the gate) ·
`src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl.ts` (`hooksVia`) ·
`src/domain.operations/init/hooks/getAllHooksOfLinkedRolesForClaudeCode.ts` (the caller) ·
clamp `syncAllRoleHooksIntoEachBrainRepl.test.ts` [case5], red with the `brain` branch off.

## .verdict

open, for the director at the pr.
