# F5 — an import across `domain.operations/*` subdirs is this repo's composition, not a scope leak

## .the fork
- A: keep the imports — `init/boots` composes the exported op of `enroll/`, `brains/`, `actor/`, `boot/`
- B: hoist the shared types into a `shared/` dir and wrap the ops behind an interface

## .taken = A, and why
`rule.forbid.scope-leaks` forbids a reach into another domain's INTERNALS — its own example is
`../../customer/internal/validate`. this repo has no `internal/` layer: each file under
`domain.operations/` exports exactly one op (`rule.require.single-responsibility`), barrels are
forbidden (`rule.forbid.barrel-exports`), so a file's one export IS the subdir's public contract.

the composition predates this route. `origin/main:src/domain.operations/init/boots/syncBootsForBrainDirs.ts`
already imports `boot/asBrainDirSyncReportLines`, `boot/BrainDirBootRender`, and
`enroll/setDeltaActorsOndisk`, and already returned the actor layout's type (via
`ReturnType<typeof asRepoActorBrainDirOutcome>['settings']`). this route names that type rather than
infers it.

`setRepoActorClaudeMdExcludes` imports `enroll/getAllClaudeMdExcludesForActor` on purpose: enroll at
spawn and init at layout must write the SAME list, so it derives one way (`.why` in its header). B
would wrap one function behind a second name — the indirection without a second implementation.

## .rework = clean
a later move to a `shared/` layer is a repo-wide convention change, independent of this route.

## .confidence = 90%, low because
a repo-wide `shared/` convention may be the wisher's preference, in which case it is its own pr.

## .where
`src/domain.operations/init/boots/{setRepoActorClaudeMdExcludes,asSettingsReplacedOfRun,syncBootsForBrainDirs,syncAndReportBrainDirBoots}.ts`

## .verdict
owed — for the wisher at the close.
