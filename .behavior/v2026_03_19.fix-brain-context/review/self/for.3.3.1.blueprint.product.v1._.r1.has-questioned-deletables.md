# self-review: has-questioned-deletables

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## components reviewed

### 1. ContextBrainSupplier.types.test.ts — can it be deleted?

**holds**: no. the wish explicitly requires `ContextBrainSupplier` type. without a type test, we have no compile-time verification that the type works as specified.

could fold into BrainAtom.types.test.ts? technically yes, but separation follows extant pattern in codebase where each domain object has its own types test.

### 2. genContextBrainSupplier.types.test.ts — can it be deleted?

**holds**: no. the factory must return the correctly typed result. the type test verifies slug literal preservation and return type inference.

### 3. actor context params (actorAsk, actorAct, genActor) — can they be deleted?

**holds**: no. blackbox criteria usecase.6 explicitly requires "context flows through actor". if we deleted this and had to add it back, we would — it's in the criteria.

### 4. integration tests for actor context flow — can they be deleted?

**holds**: no. usecase.6 requires runtime verification that context actually reaches the brain. type tests verify contracts; integration tests verify behavior.

### 5. genContextBrain.ts — did we add unnecessary changes?

**non-issue**: correctly marked as [○] retain. genContextBrain provides pre-bound brains via ContextBrain pattern, which is orthogonal to the supplier context pattern. no changes needed.

### 6. separate type test files vs consolidated — simpler version?

**holds**: separate files follow extant codebase pattern. each domain object has its own `.types.test.ts`. consolidation would break pattern consistency.

### 7. exports from index.ts — necessary?

**holds**: yes. consumers need to import `ContextBrainSupplier` type and `genContextBrainSupplier` factory. without exports, the feature is inaccessible.

---

## simplifications made

none required. each component in the blueprint:
- is explicitly required by the wish or blackbox criteria
- follows extant patterns in the codebase
- would be added back if deleted

the blueprint is minimal: only changes required by the spec, no excess.

---

## conclusion

no deletables found. the blueprint represents the minimal changeset to satisfy the wish and blackbox criteria.
