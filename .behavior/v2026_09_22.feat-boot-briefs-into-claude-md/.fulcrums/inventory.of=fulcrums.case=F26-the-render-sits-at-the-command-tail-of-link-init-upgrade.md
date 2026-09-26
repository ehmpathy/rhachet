# F26 — the render sits at the command tail of link, init and upgrade

## .fork

the wisher ruled that `rhx roles link`, `rhx init` and `rhx upgrade` all re-render the default brain
dir (S3). `init` already links through the same primitive as `roles link`
(`initRolesFromPackages` → `getRolesLinkedFromFound` → `execRoleLink`), so the render has two candidate homes.

| option | |
|---|---|
| a. inside `execRoleLink` | every link, from any caller, renders |
| b. at the tail of each command | `invokeRolesLink`, `invokeInit`, `execUpgrade` each call `syncBootsForBrainDirs` once, after their links |

## .verdict — TAKEN, 90%, rework clean

(b). `init` links N roles, so (a) would write the corpus N times per `init`, each an intermediate
state with only some roles present. the render reads the whole linked set, so it belongs after the
set is final. three call sites share one orchestrator and one exit-code transformer
(`asExitCodeForBrainDirSyncFailures`), so the duplication is one line each.

## .why the confidence is not higher

a fourth command that links roles would have to remember the tail call. no such command exists today.

## .rework

clean: a relocation of the call into `execRoleLink` behind a batch flag touches one primitive and
three callers. no caller depends on where the render sits.

## .where

- blueprint: the command table · the `init and upgrade` codepath (`invokeRolesLink`) · usecase 3 · journey [t1.3] · cell #6 · `.out of scope`
- seed S3
