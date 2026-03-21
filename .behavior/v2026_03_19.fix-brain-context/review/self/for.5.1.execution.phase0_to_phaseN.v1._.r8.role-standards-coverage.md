# review.self: role-standards-coverage (r8)

## review scope

verified coverage of mechanic role standards across all changed files. enumerated all relevant rule directories, then verified each file changed in this pr applies all applicable standards.

---

## rule directories enumerated

checked these directories in `.agent/repo=ehmpathy/role=mechanic/briefs/practices/`:

| directory | rules found | applicable to this pr |
|-----------|-------------|----------------------|
| `code.prod/evolvable.procedures/` | arrow-only, input-context-pattern, named-args, single-responsibility, dependency-injection, hook-wrapper-pattern | yes - operations and factories |
| `code.prod/evolvable.domain.objects/` | domain-objects patterns, nullable-without-reason, undefined-attributes, immutable-refs | yes - domain object types |
| `code.prod/evolvable.domain.operations/` | get-set-gen-verbs, sync-filename-opname, compute-imagine-variants | yes - genContextBrainSupplier |
| `code.prod/evolvable.architecture/` | bounded-contexts, domain-driven-design, wet-over-dry | yes - new type follows extant patterns |
| `code.prod/readable.comments/` | what-why-headers | yes - all files |
| `code.prod/readable.narrative/` | narrative-flow, early-returns, forbid-else-branches | partially - actorAsk/actorAct |
| `code.prod/pitofsuccess.typedefs/` | shapefit, forbid-as-cast, bivariance-for-generics | yes - casts documented, method syntax |
| `code.prod/pitofsuccess.errors/` | fail-fast, helpful-error | partially - runtime validation |
| `code.prod/pitofsuccess.procedures/` | idempotent-procedures, immutable-vars | partially - stateless operations |
| `code.test/frames.behavior/` | given-when-then, redundant-expensive-operations | yes - type test structure |
| `lang.terms/` | gerunds, treestruct, ubiqlang, noun_adj order, forbid-term-* | yes - all names |
| `lang.tones/` | lowercase, forbid-buzzwords, forbid-shouts | yes - all comments |

---

## file-by-file coverage verification

### BrainAtom.ts

**rule categories applicable**: domain.objects, readable.comments, pitofsuccess.typedefs, lang.terms, lang.tones

| standard | status | evidence |
|----------|--------|----------|
| what-why-headers | ✓ applied | lines 29-32: `.what`, `.why`, and `.note` jsdoc |
| lowercase | ✓ applied | all jsdoc sentences start lowercase |
| gerunds | ✓ applied | no -ing suffixes: `BrainAtom`, `ask`, `TContext` |
| treestruct | ✓ applied | `BrainAtom` = `[Brain][Atom]` follows `[Domain][Concept]` |
| bivariance-for-generics | ✓ applied | line 73: method syntax per the lesson brief |
| domain-objects | ✓ applied | extends DomainEntity, has static primary/unique |

**line-by-line coverage**:
```
line 34-37: .note documents TContext generic purpose
           ✓ follows what-why-headers pattern with optional .note
line 39:    interface BrainAtom<TContext = Empty>
           ✓ generic default is Empty (not undefined) per undefined-attributes rule
line 73-82: ask method with method syntax
           ✓ bivariance-for-generics lesson applied
           ✓ context is second param per input-context-pattern
```

**why it holds**: all applicable standards from 6 rule categories applied. no patterns absent.

---

### BrainRepl.ts

**rule categories applicable**: domain.objects, readable.comments, pitofsuccess.typedefs, lang.terms, lang.tones

| standard | status | evidence |
|----------|--------|----------|
| what-why-headers | ✓ applied | lines 14-27: `.what`, `.why`, `.sdk.map`, `.note` jsdoc |
| lowercase | ✓ applied | all jsdoc sentences start lowercase |
| gerunds | ✓ applied | no -ing suffixes: `BrainRepl`, `ask`, `act`, `TContext` |
| treestruct | ✓ applied | `BrainRepl` = `[Brain][Repl]` follows `[Domain][Concept]` |
| bivariance-for-generics | ✓ applied | lines 68, 93: method syntax on both ask and act |
| domain-objects | ✓ applied | extends DomainEntity, has static primary/unique |

**line-by-line coverage**:
```
line 24-27: .note documents TContext generic purpose
           ✓ same documentation pattern as BrainAtom — consistency
line 29:    interface BrainRepl<TContext = Empty>
           ✓ generic default is Empty per undefined-attributes rule
line 68-77: ask method with method syntax
           ✓ bivariance-for-generics lesson applied
line 93-102: act method with method syntax
           ✓ same pattern as ask — consistency
```

**why it holds**: all applicable standards from 6 rule categories applied. both ask and act methods use identical patterns.

---

### ContextBrainSupplier.ts

**rule categories applicable**: domain.objects, readable.comments, evolvable.architecture, lang.terms, lang.tones

| standard | status | evidence |
|----------|--------|----------|
| what-why-headers | ✓ applied | lines 2-3: `.what` and `.why` |
| single-responsibility | ✓ applied | single type export |
| treestruct | ✓ applied | `ContextBrainSupplier` = `Context[Brain][Supplier]` |
| bounded-contexts | ✓ applied | lives in domain.objects/, no cross-boundary imports |
| lowercase | ✓ applied | all jsdoc lowercase |
| gerunds | ✓ applied | no -ing suffixes in type name |

**line-by-line coverage**:
```
line 6-7:  .example shows concrete usage
           ✓ follows what-why-headers with optional .example
line 10:   "optional by mandate" documented
           ✓ design decision articulated in .note
line 14:   [K in `brain.supplier.${TSlug}`]?: TSupplies
           ✓ optional (?) per "optional by mandate"
```

**why it holds**: single-purpose type file with full documentation. follows extant `Context{Domain}` naming pattern from ContextBrain.ts and ContextCli.ts.

---

### genContextBrainSupplier.ts

**rule categories applicable**: evolvable.procedures, evolvable.domain.operations, readable.comments, pitofsuccess.typedefs, lang.terms, lang.tones

| standard | status | evidence |
|----------|--------|----------|
| arrow-only | ✓ applied | line 18: `const genContextBrainSupplier = <...>(...) =>` |
| what-why-headers | ✓ applied | lines 4-5: `.what` and `.why` |
| single-responsibility | ✓ applied | single function export |
| get-set-gen-verbs | ✓ applied | uses `gen` prefix for factory |
| sync-filename-opname | ✓ applied | filename matches function name |
| forbid-as-cast | ✓ documented | line 16: `.note` explains why cast needed |
| treestruct | ✓ applied | `genContext[Brain][Supplier]` follows `gen[Context][Domain]` |
| lowercase | ✓ applied | all jsdoc lowercase |

**line-by-line coverage**:
```
line 1:    import type { ContextBrainSupplier }
           ✓ type-only import — avoids runtime dependency
line 8-12: .example shows concrete usage
           ✓ pit-of-success via documentation
line 16:   "cast is required due to typescript computed property key limitation"
           ✓ forbid-as-cast rule satisfied via documented reason
line 18-21: function signature
           ✓ arrow syntax per arrow-only
           ✓ params are named (supplier, supplies) not positional
line 24:   as ContextBrainSupplier<TSlug, TSupplies>
           ✓ cast is necessary, documented, not silent
```

**why it holds**: all 8 applicable standards applied. cast is documented per forbid-as-cast rule.

---

### actorAsk.ts

**rule categories applicable**: evolvable.procedures, readable.comments, readable.narrative, pitofsuccess.typedefs, lang.terms, lang.tones

| standard | status | evidence |
|----------|--------|----------|
| arrow-only | ✓ applied | line 27: `const actorAsk = async <...>(...) =>` |
| input-context-pattern | ✓ applied | lines 28-34: `(input: {...}, context?: TContext)` |
| what-why-headers | ✓ applied | lines 18-19: `.what` and `.why` |
| single-responsibility | ✓ applied | one main export, one constant |
| forbid-as-cast | ✓ documented | line 45: comment explains runtime validation |
| narrative-flow | ✓ applied | lines 36, 44: paragraph comments before blocks |
| lowercase | ✓ applied | all comments lowercase |
| gerunds | ✓ applied | no -ing suffixes |

**line-by-line coverage**:
```
line 23-25: .note documents TContext generic purpose
           ✓ same pattern as BrainAtom/BrainRepl
line 28-33: input object with named keys
           ✓ input-context-pattern: input is first param
line 34:   context?: TContext
           ✓ input-context-pattern: context is optional second param
line 36:   // derive briefs from role
           ✓ narrative-flow: paragraph header
line 44:   // execute fluid conversation with brain
           ✓ narrative-flow: paragraph header
line 45:   // note: cast context to any — actor passes through, brain validates at runtime
           ✓ forbid-as-cast: cast documented with reason
line 52:   context as any
           ✓ cast is documented, not silent
```

**why it holds**: all 8 applicable standards applied. input-context-pattern fully followed.

---

### actorAct.ts

**rule categories applicable**: evolvable.procedures, readable.comments, readable.narrative, pitofsuccess.typedefs, lang.terms, lang.tones

| standard | status | evidence |
|----------|--------|----------|
| arrow-only | ✓ applied | line 16: `const actorAct = async <...>(...) =>` |
| input-context-pattern | ✓ applied | lines 17-23: `(input: {...}, context?: TContext)` |
| what-why-headers | ✓ applied | lines 9-10: `.what` and `.why` |
| single-responsibility | ✓ applied | single export |
| forbid-as-cast | ✓ documented | line 34: comment explains runtime validation |
| narrative-flow | ✓ applied | lines 25, 33: paragraph comments |
| lowercase | ✓ applied | all comments lowercase |
| gerunds | ✓ applied | no -ing suffixes |

**line-by-line coverage**:
```
line 14:   .note documents TContext generic purpose
           ✓ same pattern as actorAsk — consistency
line 17-22: input object with named keys
           ✓ input-context-pattern: input is first param
line 23:   context?: TContext
           ✓ input-context-pattern: context is optional second param
line 25:   // derive briefs from role
           ✓ narrative-flow: paragraph header (same text as actorAsk)
line 33:   // execute rigid skill with brain
           ✓ narrative-flow: paragraph header
line 34:   // note: cast context to any — actor passes through, brain validates at runtime
           ✓ forbid-as-cast: cast documented with reason (same pattern as actorAsk)
```

**why it holds**: all 8 applicable standards applied. identical pattern to actorAsk — consistent treatment.

---

### ContextBrainSupplier.types.test.ts

**rule categories applicable**: code.test, readable.comments, lang.terms, lang.tones

| standard | status | evidence |
|----------|--------|----------|
| what-why-headers | ✓ applied | lines 2-3: `.what` and `.why` |
| test-structure | ✓ applied | describe/it at lines 149-154 |
| lowercase | ✓ applied | all comments lowercase |
| gerunds | ✓ applied | no -ing suffixes |

**line-by-line coverage**:
```
line 5:    .note explains compile-time test mechanism
           ✓ type tests documented as "run at compile time"
line 19:   /** test: ContextBrainSupplier has key 'brain.supplier.${slug}' */
           ✓ lowercase, describes specific test
line 38:   /** test: value is optional (optional by mandate) */
           ✓ lowercase, describes specific test
line 149-154: describe/it runtime validation
           ✓ test-structure: validates compilation
```

**why it holds**: type test file with appropriate structure. iife pattern for compile-time tests, describe/it for runtime validation.

---

### genContextBrainSupplier.types.test.ts

**rule categories applicable**: code.test, readable.comments, lang.terms, lang.tones

| standard | status | evidence |
|----------|--------|----------|
| what-why-headers | ✓ applied | lines 2-3: `.what` and `.why` |
| test-structure | ✓ applied | describe/it at lines 122-127 |
| lowercase | ✓ applied | all comments lowercase |
| gerunds | ✓ applied | no -ing suffixes |

**line-by-line coverage**:
```
line 5:    .note explains compile-time test mechanism
           ✓ same pattern as ContextBrainSupplier.types.test.ts
line 21:   /** test: return type inference preserves slug literal */
           ✓ lowercase, describes specific test
line 37:   /** test: supplies type flows through */
           ✓ lowercase, describes specific test
line 57:   /** test: result is assignable to ContextBrainSupplier */
           ✓ lowercase, describes specific test
line 74:   /** test: multiple supplier contexts via spread */
           ✓ lowercase, describes specific test
line 97:   /** test: different slug types produce incompatible results */
           ✓ lowercase, describes specific test
line 122-127: describe/it runtime validation
           ✓ test-structure: validates compilation
```

**why it holds**: type test file with appropriate structure. 5 distinct type test cases, all with lowercase comments. same iife + describe/it pattern as ContextBrainSupplier.types.test.ts.

---

## gaps found and fixed

none found. all changed files have full coverage of applicable mechanic role standards.

---

## summary

| file | rule categories | standards applied | gaps |
|------|-----------------|-------------------|------|
| BrainAtom.ts | 6 | 6 | 0 |
| BrainRepl.ts | 6 | 6 | 0 |
| ContextBrainSupplier.ts | 6 | 6 | 0 |
| genContextBrainSupplier.ts | 8 | 8 | 0 |
| actorAsk.ts | 8 | 8 | 0 |
| actorAct.ts | 8 | 8 | 0 |
| ContextBrainSupplier.types.test.ts | 4 | 4 | 0 |
| genContextBrainSupplier.types.test.ts | 4 | 4 | 0 |

all 8 files have full coverage. no absent patterns detected.

