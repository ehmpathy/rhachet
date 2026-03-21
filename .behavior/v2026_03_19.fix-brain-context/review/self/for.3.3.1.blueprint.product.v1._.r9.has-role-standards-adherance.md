# self-review: has-role-standards-adherance (round 9)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## round 9 depth — implementation risk verification

r8 verified against standards. r9 verifies implementation risks that could cause the junior to deviate from standards once code is written.

---

## risk 1: input-context pattern on genContextBrainSupplier

**r8 result**: factory pattern acceptable, not a domain operation

**deeper verification**:
- extant `genContextBrain` signature (line 1 of file):
  ```ts
  export const genContextBrain = async <TBrainChoice extends BrainChoice | null>(
    input: { brain: TBrainChoice },
  ): Promise<ContextBrain<TBrainChoice>> => { ... }
  ```
- extant `genContextStitchTrail` signature:
  ```ts
  export const genContextStitchTrail = <TTrail>(
    trail: TTrail,
  ): ContextStitchTrail<TTrail> => { ... }
  ```

**observation**: both extant factories use single positional param (not wrapped in `input:` object).

**blueprint proposes**:
```ts
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
  supplier: TSlug,
  supplies: TSupplies,
): ContextBrainSupplier<TSlug, TSupplies> => { ... }
```

**risk**: two positional params — more than extant pattern.

**mitigation options**:
1. wrap in input object: `(input: { supplier: TSlug, supplies: TSupplies })`
2. accept two params (simpler call site)

**analysis**:
- genContextStitchTrail takes single `trail` param
- genContextBrain takes single `input: { brain }` param
- genContextBrainSupplier takes two params — breaks pattern

**decision**: the wish explicitly specifies this signature (lines 53-59):
```ts
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
  supplier: TSlug,
  supplies: TSupplies,
): ContextBrainSupplier<TSlug, TSupplies> => { ... }
```

wish is source of truth. implementation follows wish. no gap.

**verdict**: ✓ follows wish specification

---

## risk 2: class generic DomainEntity inheritance

**r8 result**: follows DomainEntity convention

**deeper verification**:
- BrainAtom currently extends DomainEntity. when we add `<TContext>`, the generic must flow correctly.

**codebase pattern** (ContextBrain.ts lines 38-89):
```ts
export interface ContextBrain<TBrainChoice = BrainChoice | null> {
  brain: { ... }
}

export class ContextBrain<TBrainChoice = BrainChoice | null>
  extends DomainLiteral<ContextBrain<TBrainChoice>>
  implements ContextBrain<TBrainChoice> {
  public static nested = { ... };
}
```

**observation**: ContextBrain passes `<TBrainChoice>` through to DomainLiteral and implements clause.

**blueprint states**:
```
class BrainAtom<TContext = Empty>
    extends DomainEntity<BrainAtom<TContext>>
    implements BrainAtom<TContext>
```

**risk**: junior might write `DomainEntity<BrainAtom>` without `<TContext>`.

**mitigation**: blueprint explicitly shows `<TContext>` in extends clause. type tests will catch this — if omitted, `BrainAtom<ContextBrainSupplierXai>` won't be assignable to `DomainEntity<BrainAtom>`.

**verdict**: ✓ pattern documented, type tests will catch deviation

---

## risk 3: optional param vs required param

**standard**: context should be optional (`context?:`)

**blueprint states**:
```ts
ask: <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
  input: { ... },
  context?: TContext,
) => Promise<BrainOutput<TOutput, 'atom', TPlugs>>;
```

**risk**: junior might write `context: TContext` (required) instead of `context?: TContext` (optional).

**verification**:
- criteria usecase.3 explicitly requires optional: "typescript allows the call (context is optional)"
- criteria usecase.4 backwards compat requires optional: "no context is required"
- blueprint shows `context?:` with `?`

**mitigation**: type tests for backwards compat will fail if context is required — extant callers don't pass context.

**verdict**: ✓ type tests will catch this

---

## risk 4: Empty import

**standard**: use Empty type from type-fns

**blueprint states**: `TContext = Empty` default

**risk**: junior might define own Empty type or use `{}`.

**verification**:
- Empty is already used throughout codebase (from type-fns)
- import pattern extant

**mitigation**: if junior uses wrong type, `context?: Empty` semantics may differ — type tests will catch.

**verdict**: ✓ extant pattern, type tests will catch

---

## risk 5: actor context param placement

**standard**: context after input

**blueprint states**:
```
actorAsk<TContext = Empty>
├─ [~] input: add optional context?: TContext
├─ [~] impl: pass context to brain.ask(..., context)
```

**risk**: junior might add context as third param or nested in input.

**verification**:
- wish signature shows `ask(input, context?)` — two params
- actor should mirror this

**analysis**: blueprint shows "add optional context?: TContext" — implies second param.

**mitigation**: integration tests verify context flows to brain — if placement wrong, tests fail.

**verdict**: ✓ integration tests will catch

---

## risk 6: test file colocation

**standard**: tests collocated with source

**blueprint states**:
```
├─ [~] BrainAtom.ts                           # add TContext generic
├─ [~] BrainAtom.types.test.ts                # add context type tests
```

**verification**: tests live next to source — follows colocation pattern.

**verdict**: ✓ follows colocation standard

---

## risk 7: export visibility

**standard**: export new types from index.ts

**blueprint states**:
```
├─ [~] domain.objects/index.ts                # export new type
└─ [~] src/index.ts                           # export new factory + type
```

**risk**: junior might forget to export from index.ts.

**mitigation**: if not exported, consumers can't import — will be caught in integration/acceptance tests.

**verdict**: ✓ blueprint documents export, tests will catch

---

## risk 8: genContextBrainSupplier return type cast

**standard**: avoid `as` casts; shapes should fit

**blueprint states**:
```ts
return { [`brain.supplier.${supplier}`]: supplies } as ContextBrainSupplier<TSlug, TSupplies>;
```

**risk**: junior might forget the cast, get type error.

**verification**:
- cast is required due to TS computed property limitation
- documented in r4 and r8 reviews
- if cast omitted, type error occurs — junior will add cast

**verdict**: ✓ type system forces correct cast

---

## summary

all risks verified:

| risk | mitigation | verdict |
|------|------------|---------|
| input-context pattern on factory | wish specifies signature | ✓ follows wish |
| class generic inheritance | type tests catch deviation | ✓ documented |
| optional vs required param | type tests catch | ✓ documented |
| Empty import | extant pattern | ✓ standard |
| actor context placement | integration tests catch | ✓ documented |
| test colocation | follows standard | ✓ documented |
| export visibility | tests catch | ✓ documented |
| return type cast | type system forces | ✓ required |

no implementation risks unmitigated. blueprint adheres to standards with clear verification mechanisms.

