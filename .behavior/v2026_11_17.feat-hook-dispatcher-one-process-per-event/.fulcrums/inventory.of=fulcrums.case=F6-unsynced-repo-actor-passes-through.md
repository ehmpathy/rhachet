# F6 — an actor derived from an unsynced repo actor passes through, as before

## .the fork

a repo upgrades rhachet but has not yet run `rhx init --hooks`. its repo actor holds per-rule role
hooks in `settings.of.repo.json` and no `hooks.dispatch.manifest`. at enroll, the per-actor derive can:

- **(a)** pass through: the settings narrow by author, exactly as before this change; the clone runs one
  process per rule until the next `init --hooks`
- **(b)** refuse: a `ConstraintError` that names `rhx init --hooks`, so no clone spawns on the old shape

## .taken

(a). one line (`if (!source) return input.settings`), no new path: the narrow by author that ran
before this change still runs. a clone in a repo mid-upgrade keeps its hooks, and the isolation guard
(`case=9`) reads the old shape as it always did.

## .rework

clean. (b) is one throw in `setActorHookDispatchManifestDerived.ts`, plus an acceptance case.

## .confidence

88%. the wish asks that every rule decide as today, which (a) holds. it does not say whether an
unsynced repo should be pushed onto the dispatcher at enroll; (b) would surface the cost win sooner,
at the price of a refused enroll after a bare `pnpm install`.

## .where

`src/domain.operations/enroll/setActorHookDispatchManifestDerived.ts`

## .verdict

open, for the director at the pr.
