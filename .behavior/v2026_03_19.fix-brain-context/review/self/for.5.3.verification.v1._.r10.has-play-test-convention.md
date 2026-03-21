# review.self: has-play-test-convention (r10)

## review scope

verified whether journey tests use the `.play.test.ts` convention.

---

## test files modified by this behavior

```
src/domain.operations/actor/actorAct.test.ts
src/domain.operations/actor/actorAsk.test.ts
src/domain.operations/brainContinuation/brainRepl.tool.coordination.test.ts
src/domain.operations/context/genContextBrain.integration.test.ts
src/domain.operations/context/genContextBrain.test.ts
```

none use `.play.` suffix.

---

## search for `.play.test.ts` in codebase

```
glob: **/*.play.test.ts
result: no files found

glob: **/*.play.*.test.ts
result: no files found
```

the `.play.` convention is not used in this repo.

---

## repo test conventions

surveyed extant test files:

| pattern | count | purpose |
|---------|-------|---------|
| `*.test.ts` | many | unit tests |
| `*.integration.test.ts` | many | integration tests |
| `*.types.test.ts` | 2 | compile-time type tests |
| `*.acceptance.test.ts` | many | acceptance tests |
| `*.play.test.ts` | 0 | journey tests (not used) |

this repo follows the standard `*.test.ts` / `*.integration.test.ts` / `*.acceptance.test.ts` convention without the `.play.` layer.

---

## why `.play.` convention not applicable

### 1. repo established convention before `.play.`

the repo has 50+ test files that follow `*.test.ts` / `*.integration.test.ts`. to introduce `.play.` now would:
- fragment the test suite
- require migration of extant tests
- add cognitive load without clear benefit

### 2. this behavior adds type contracts, not user journeys

the behavior adds compile-time type contracts:
- `ContextBrainSupplier<TSlug, TSupplies>` — type alias
- `genContextBrainSupplier(slug, supplies)` — factory
- `BrainAtom<TContext>` — interface generic
- `BrainRepl<TContext>` — interface generic

these are verified via `.types.test.ts`, not journey tests:
- `ContextBrainSupplier.types.test.ts`
- `genContextBrainSupplier.types.test.ts`

### 3. journey tests would be in rhachet-brains-xai

the behavior adds infrastructure for brain suppliers to use. the actual user journey:

```
supplier defines context type → consumer constructs context → brain receives context
```

this journey spans two repos:
- `rhachet` (infrastructure) — tested via type tests
- `rhachet-brains-xai` (consumer) — would have journey tests

journey tests belong in `rhachet-brains-xai`, not here.

---

## fallback convention used

per the guide: "if not supported, is the fallback convention used?"

yes. this repo uses fallback conventions:

| test type | convention | example |
|-----------|------------|---------|
| unit | `*.test.ts` | `actorAsk.test.ts` |
| integration | `*.integration.test.ts` | `actorAsk.integration.test.ts` |
| type | `*.types.test.ts` | `ContextBrainSupplier.types.test.ts` |

the type tests serve as "journey tests" for type contracts — they prove the types compile and work as designed.

---

## verification: tests are in right location

| test file | location | correct? |
|-----------|----------|----------|
| `ContextBrainSupplier.types.test.ts` | `src/domain.objects/` | ✓ yes — collocated with type |
| `genContextBrainSupplier.types.test.ts` | `src/domain.operations/context/` | ✓ yes — collocated with factory |
| `actorAsk.test.ts` | `src/domain.operations/actor/` | ✓ yes — collocated with operation |
| `actorAct.test.ts` | `src/domain.operations/actor/` | ✓ yes — collocated with operation |

all tests are collocated with their tested code.

---

## conclusion

| question | answer |
|----------|--------|
| are journey tests named with `.play.`? | n/a — `.play.` not used in this repo |
| is fallback convention used? | ✓ yes — `*.types.test.ts` |
| are tests in right location? | ✓ yes — collocated |
| does convention make sense? | ✓ yes — type contracts need type tests |

`.play.test.ts` convention not applicable. fallback convention (`.types.test.ts` for type contracts) is correct for this behavior.

