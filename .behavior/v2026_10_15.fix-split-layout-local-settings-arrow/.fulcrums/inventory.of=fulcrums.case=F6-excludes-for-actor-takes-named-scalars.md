# F6 — `getAllClaudeMdExcludesForActor` takes four named fields, not a minted domain object

## .the fork
- A: keep the named input `{ repoPath, repoActorBrainDir, actorBrainDir, isRepoActor }`
- B: mint a brain-dir reference domain object, and derive `isRepoActor` from its paths

## .taken = A, and why
the input is one named object, never positional args — the hazard
`rule.require.domain-driven-design` targets (*"function updateUser(name, email, phone)"*) is absent.

`isRepoActor` is not derivable from the paths without a change of sense. both callers decide it by
IDENTITY: `genBrainCliConfigArtifact` reads `input.exid === REPO_ACTOR_EXID`, and
`setRepoActorClaudeMdExcludes` is the repo actor by construction. a path compare would trade an
identity fact for a path-form guess (a realpath against an unresolved path reads unequal), and the
cost of a wrong answer is an actor whose own boot is excluded.

no brain-dir reference object exists in `domain.objects/`; to mint one for one pure transformer with
two callers is the premature abstraction `rule.prefer.wet-over-dry` warns of.

## .rework = clean
a pure transformer with two callers; a later object swaps its input in one edit.

## .confidence = 90%, low because
a brain-dir domain object may earn its place once a third caller arrives.

## .where
`src/domain.operations/enroll/getAllClaudeMdExcludesForActor.ts`

## .verdict
owed — for the wisher at the close.
