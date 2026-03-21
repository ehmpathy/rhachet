# self-review: has-consistent-conventions (round 6)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## round 6 depth — verified r5 findings with citations

r5 concluded all names follow conventions. r6 verifies each with explicit codebase citations.

---

### name 1: ContextBrainSupplier — verified with citations

**r5 claim**: follows `Context*` prefix pattern

**codebase citations**:
```
src/domain.objects/ContextBrain.ts:38 → export interface ContextBrain<TBrainChoice = BrainChoice | null>
src/domain.objects/ContextCli.ts → export interface ContextCli
src/domain.objects/RoleContext.ts → export type RoleContext
```

**analysis**:
- ContextBrain: `Context` + `Brain` — the domain for brain choice/invocation
- ContextBrainSupplier: `Context` + `Brain` + `Supplier` — the domain for brain credential supply
- "Supplier" is a valid domain noun (matches terraform's "provider" concept from briefs)

**why this holds**: the pattern is `Context` + domain-specific qualifier. `BrainSupplier` describes what the context supplies — credentials for brains.

**verdict**: holds. follows extant pattern.

---

### name 2: genContextBrainSupplier — verified with citations

**r5 claim**: follows `genContext*` prefix pattern

**codebase citations**:
```
src/domain.operations/context/genContextBrain.ts → export const genContextBrain
src/domain.operations/context/genContextStitchTrail.ts → export const genContextStitchTrail
src/domain.operations/keyrack/genContextKeyrackGrantGet.ts → export const genContextKeyrackGrantGet
```

**analysis**:
- genContextBrain: `genContext` + `Brain` — generates ContextBrain
- genContextBrainSupplier: `genContext` + `BrainSupplier` — generates ContextBrainSupplier
- function name matches type name pattern (genContext* → Context*)

**why this holds**: the factory pattern is `gen` + TypeName. ContextBrainSupplier is the type, genContextBrainSupplier is the factory.

**verdict**: holds. follows extant pattern.

---

### name 3: TContext generic parameter — verified with citations

**r5 claim**: follows `T*` prefix pattern for generics

**codebase citations**:
```
src/domain.objects/ContextBrain.ts:38 → interface ContextBrain<TBrainChoice = BrainChoice | null>
src/domain.objects/BrainOutput.ts → interface BrainOutput<TOutput, TMode, TPlugs>
src/domain.objects/BrainRepl.ts → interface BrainRepl (no TContext yet)
src/domain.objects/BrainAtom.ts → interface BrainAtom (no TContext yet)
```

**analysis**:
- extant generics use `T` prefix: TBrainChoice, TOutput, TMode, TPlugs
- proposed: TContext follows same pattern
- default value pattern: `TBrainChoice = BrainChoice | null` matches proposed `TContext = Empty`

**why this holds**: TypeScript convention `T*` for type parameters is universal in this codebase.

**verdict**: holds. follows extant pattern.

---

### name 4: brain.supplier.${slug} key — verified intentional divergence

**r5 claim**: intentional divergence from nested pattern, per wish

**codebase citations**:
```
src/domain.objects/ContextBrain.ts:42-88 → nested structure: brain.atom.ask, brain.repl.ask
wish.md:31-40 → exact key specification: brain.supplier.${slug}
wish.md:73-89 → composition example shows spread works because different keys
```

**analysis**:
- ContextBrain uses nested: `context.brain.atom`, `context.brain.repl`, `context.brain.choice`
- ContextBrainSupplier uses flat mapped key: `context['brain.supplier.xai']`
- these differ intentionally — wish explicitly documents they compose via spread

**why this holds**: the wish is the source of truth. it explicitly requests this key format to enable composition without collision.

**verdict**: holds. intentional per wish.

---

### name 5: file locations — verified with citations

**r5 claim**: types in domain.objects/, factories in domain.operations/context/

**codebase citations**:
```
src/domain.objects/ContextBrain.ts → type lives here
src/domain.operations/context/genContextBrain.ts → factory lives here
src/domain.operations/context/genContextStitchTrail.ts → context factories grouped here
```

**analysis**:
- types: domain.objects/ is where domain types live
- factories: domain.operations/context/ is where context factories live
- proposed structure matches exactly

**why this holds**: we follow the established file organization pattern.

**verdict**: holds. follows extant structure.

---

### name 6: test files — verified with citations

**r5 claim**: follows *.types.test.ts for compile-time type tests

**codebase citations**:
```
src/domain.operations/context/genContextBrain.types.test.ts → extant type test
src/domain.objects/BrainAtom.test.ts → extant unit test
```

**analysis**:
- `.types.test.ts` suffix is used for compile-time type tests
- `.test.ts` suffix is used for runtime unit tests
- `.integration.test.ts` suffix is used for integration tests

**why this holds**: we follow the established test file convention.

**verdict**: holds. follows extant pattern.

---

## edge cases considered

### should it be ContextSupplierBrain instead of ContextBrainSupplier?

**no**. the pattern is `Context` + [qualified domain]:
- ContextBrain → context for brain operations
- ContextBrainSupplier → context for brain supplier (subtype of brain domain)

`ContextSupplierBrain` would suggest "supplier context for brain" which inverts the relationship.

### should TContext be called TSupplies or TContextSupplier?

**no**. the generic is `TContext` because:
- it represents the context type constraint
- callers can pass any context type, not just supplier context
- `TSupplies` would be too narrow — what if a brain needs multiple supplier contexts?

### why not context.brain.suppliers.xai (nested)?

the wish explicitly chose the flat mapped key `brain.supplier.${slug}`. this enables:
- TypeScript literal type preservation via mapped types
- spread composition without deep merge
- clear separation from ContextBrain's nested structure

---

## conclusion

all r5 findings verified with explicit codebase citations:

| name | extant pattern | citations | verdict |
|------|----------------|-----------|---------|
| ContextBrainSupplier | Context* prefix | ContextBrain.ts, ContextCli.ts | ✓ verified |
| genContextBrainSupplier | genContext* prefix | genContextBrain.ts, genContextStitchTrail.ts | ✓ verified |
| TContext | T* prefix | ContextBrain.ts, BrainOutput.ts | ✓ verified |
| brain.supplier.${slug} | wish-specified | wish.md:31-40, :73-89 | ✓ intentional |
| file locations | domain.objects/, domain.operations/context/ | extant files | ✓ verified |
| test files | *.types.test.ts | genContextBrain.types.test.ts | ✓ verified |

no divergence from conventions. all names follow established patterns or are explicitly specified in wish.

