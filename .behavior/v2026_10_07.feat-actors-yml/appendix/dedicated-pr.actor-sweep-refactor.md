# refactor(actors): one collect-or-throw helper and the actor-sweep shape moves

a planned dedicated PR, scoped out of #699 (`beav/feat-actors-yml`) by fulcrums F19 and F21. no
behavior a human sees changes except the refusal frames named in part 1.

## .part 1 — one collect-or-throw helper (F19)

four sweeps carry the same catch: a code defect rethrows (`isCodeDefectError`), a non-Error wraps
in a `MalfunctionError`, else a `BrainDirBootFailure` with a scope.

- `src/domain.operations/init/boots/setDeclaredActorsOndisk.ts` (three copies)
- `src/domain.operations/enroll/setDeltaActorsOndisk.ts` (three copies)
- `src/domain.operations/init/boots/syncActiveActorBrainDirs.ts` (`asErrorCollectedOrThrow`)
- `src/domain.operations/init/boots/asRepoActorBrainDirOutcome.ts`

the change: one `asBrainDirBootFailure({ scope, error })`; each catch becomes one call. the
non-Error message is settled once, so the `init.*` and `enroll.*` acceptance refusal frames resnap.

## .part 2 — the six shape moves (F21)

1. one `asActorsPartitioned({ actors, manifest })` → `{ repo, declared, delta, hash }`, read once in
   `syncBootsForBrainDirs`; delete `asFailuresWithEnumerationOnce`
2. one `getOneRoleRefLinkedOfSpecifier` for the "declares role …, which is not linked" refusal,
   today in `asRoleRefsOfActorExpanded` and `asActorFormEnrollment`, with one role order
   (`expanded.roles`)
3. move `setActorSettingsDerived` under `actor/enrolled/`, so `enroll` → `init` and `init` →
   `enroll` stop to cross
4. one `getActorOndiskManifestPath({ repoPath, exid })` for the 7 hand joins of `actor.json`
5. move `isSafeCloneSlug` to a neutral `actor/` home, so `actor/manifest` stops to import `clone/`
6. one `asInitRefusalOfManifest` transformer, called once from `invokeInit`

## .bounds

- in: the files above, their unit and integration tests, the resnapped refusal frames
- out: any change to what init, enroll or clone decide; any new flag or output row
- each part lands as its own commit, so a revert can take one without the other

## .why it is its own PR

each move opens files #699 did not otherwise need, two of the four sweeps predate the branch, and
part 1 moves refusal text across suites. it re-shapes the sweep contract every actor form rides,
so it earns its own focused review.

---

dispatched by human + beaver 🦫
