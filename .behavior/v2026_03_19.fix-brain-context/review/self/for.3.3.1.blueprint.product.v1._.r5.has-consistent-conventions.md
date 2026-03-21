# self-review: has-consistent-conventions (round 5)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## convention review — name patterns

for each name choice in the blueprint, verify it follows extant conventions.

---

### name 1: ContextBrainSupplier

**extant pattern**: reviewed `ContextBrain`, `ContextCli`, `RoleContext`

| extant type | pattern |
|-------------|---------|
| ContextBrain | `Context` prefix + domain noun |
| ContextCli | `Context` prefix + domain noun |

**blueprint proposes**: `ContextBrainSupplier`

**analysis**:
- follows `Context` prefix pattern
- domain nouns: `Brain` + `Supplier`
- PascalCase (matches extant)

**verdict**: consistent. follows extant `Context*` pattern.

---

### name 2: genContextBrainSupplier

**extant pattern**: reviewed genContext factories

| extant factory | pattern |
|----------------|---------|
| genContextBrain | `genContext` prefix + domain noun |
| genContextStitchTrail | `genContext` prefix + domain noun |
| genContextKeyrackGrantGet | `genContext` prefix + domain noun path |

**blueprint proposes**: `genContextBrainSupplier`

**analysis**:
- follows `genContext` prefix pattern
- domain noun: `BrainSupplier`
- camelCase (matches extant)

**verdict**: consistent. follows extant `genContext*` pattern.

---

### name 3: TContext generic parameter

**extant pattern**: reviewed interface generics

| extant interface | generic pattern |
|------------------|-----------------|
| ContextBrain<TBrainChoice> | `T` prefix + descriptive noun |
| BrainOutput<TOutput, TMode, TPlugs> | `T` prefix + descriptive noun |

**blueprint proposes**: `BrainAtom<TContext>`, `BrainRepl<TContext>`

**analysis**:
- follows `T` prefix pattern
- descriptive noun: `Context`
- matches extant generic param style

**verdict**: consistent. follows extant `T*` pattern.

---

### name 4: brain.supplier.${slug} key

**extant pattern**: reviewed context key patterns

| extant key | pattern |
|------------|---------|
| context.brain.* | nested object |
| ContextBrain uses nested: brain.atom, brain.repl, brain.choice | dot-separated hierarchy |

**blueprint proposes**: `brain.supplier.${slug}` as mapped key

**analysis**:
- template literal key `brain.supplier.xai`
- different from nested `context.brain.atom` — intentional per wish
- wish explicitly specifies this key format (lines 31-40)

**why this holds**: the wish explicitly requests this exact key pattern. it differs from ContextBrain's nested pattern intentionally — these contexts compose via spread, so different key shapes prevent collision.

**verdict**: consistent with wish. intentional divergence from nested pattern.

---

### name 5: file locations

**extant pattern**: reviewed file structure

| extant | location |
|--------|----------|
| ContextBrain.ts | src/domain.objects/ |
| genContextBrain.ts | src/domain.operations/context/ |

**blueprint proposes**:
- ContextBrainSupplier.ts → src/domain.objects/
- genContextBrainSupplier.ts → src/domain.operations/context/

**analysis**:
- types in domain.objects/ (matches extant)
- factories in domain.operations/context/ (matches extant)

**verdict**: consistent. follows extant file structure.

---

### name 6: test file conventions

**extant pattern**: reviewed test file names

| extant | pattern |
|--------|---------|
| genContextBrain.test.ts | operation.test.ts |
| genContextBrain.types.test.ts | operation.types.test.ts |
| genContextBrain.integration.test.ts | operation.integration.test.ts |

**blueprint proposes**:
- ContextBrainSupplier.types.test.ts
- genContextBrainSupplier.types.test.ts

**analysis**:
- follows `.types.test.ts` suffix for compile-time type tests
- matches extant pattern

**verdict**: consistent. follows extant test file conventions.

---

## conclusion

all name choices follow extant conventions:

| name | extant pattern | verdict |
|------|----------------|---------|
| ContextBrainSupplier | Context* prefix | ✓ consistent |
| genContextBrainSupplier | genContext* prefix | ✓ consistent |
| TContext | T* prefix | ✓ consistent |
| brain.supplier.${slug} | explicitly requested in wish | ✓ intentional |
| file locations | domain.objects/, domain.operations/ | ✓ consistent |
| test files | *.types.test.ts | ✓ consistent |

no divergence from extant conventions found.

