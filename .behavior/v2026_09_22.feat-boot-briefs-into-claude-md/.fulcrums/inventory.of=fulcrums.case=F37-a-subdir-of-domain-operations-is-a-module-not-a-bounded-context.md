# F37 — a subdir of `domain.operations/` is a module, not a bounded context

## .fork

peer r5 (scope-leaks) graded three blockers: `boot/` imports from `actor/enrolled/` and `upgrade/`,
`boot/` imports from `role/`, and `init/boots/` imports from `actor/`, `boot/` and `init/roles/link/`.
each is read as a reach into another bounded context's internals.

| option | |
|---|---|
| a. hold | the subdirs of `domain.operations/` are modules of one context. a direct import of a named leaf operation is how this repo composes them |
| b. a contract layer | re-export each leaf through a per-subdir contract module, and import only that |

## .verdict — TAKEN (a), 85%, rework clean

the repo on `main` composes subdirs by direct leaf import, in the very files this change extends:

- `upgrade/execUpgrade.ts` imports `init/hooks/syncHooksForLinkedRoles` and `init/roles/link/initRolesFromPackages`
- `init/hooks/syncHooksForLinkedRoles.ts` imports `actor/enrolled/getActorOndiskDir` and `actor/enrolled/getAllActorsOndisk`

(b) is a per-subdir index that forwards imports, which `rule.forbid.barrel-exports` forbids outright.

the actor dir transformers are single-owned on purpose (`define.enrollment-identity-is-the-roleset-hash`:
*"route through `getActorsRootDir` — it is single-owned on purpose"*). to reach them by import is
the mandate, and a copy in `boot/` or `init/` is the defect that brief warns of.

`RoleLinkRef` lives in `upgrade/discoverLinkedRoles` on `main`, and `main`'s
`init/roles/link/getRemovalTargets.ts` already imports it from there. a move of that type to `domain.objects/` would be a clean, separate change; it is
not a leak this branch introduced.

## .why the confidence is not higher

the reviewer's model — one bounded context per subdir — is a real architecture some repos adopt. if
the wisher wants this repo to adopt it, the move is repo-wide, and this branch's imports would go
with the rest.

## .rework

clean: a later contract layer changes import paths only; no behavior moves.

## .where

- `src/domain.operations/boot/asRoleRefsInEnrollmentOrder.ts`
- `src/domain.operations/boot/setBrainDirBoot.ts` · `getOneRoleBootContent.ts`
- `src/domain.operations/init/boots/syncDefaultBrainDir.ts` · `syncActiveActorBrainDirs.ts` · `asRoleRefsForEnrolledSlugs.ts`
