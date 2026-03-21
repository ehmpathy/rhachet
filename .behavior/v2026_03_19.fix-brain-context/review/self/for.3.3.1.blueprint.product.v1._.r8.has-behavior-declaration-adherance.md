# self-review: has-behavior-declaration-adherance (round 8)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## round 8 depth — cross-document consistency and edge case verification

r7 verified adherance line by line. r8 verifies cross-document consistency and edge cases that could cause implementation drift.

---

## cross-document consistency check

### check 1: wish → vision → criteria → blueprint flow

**wish states** (lines 20-28):
```ts
interface BrainAtom<TContext = Empty> {
  ask: <TOutput, TPlugs>(input, context?: TContext) => ...
}
```

**vision states** (day-in-the-life: after):
```ts
export const genBrainAtom = (input: { slug: XaiBrainAtomSlug }): BrainAtom<ContextBrainSupplierXai> => {
  return new BrainAtom({ ... });
};
```

**criteria states** (usecase.1):
```
then typescript accepts the return type BrainAtom<ContextBrainSupplierXai>
then the ask method accepts context of that type
```

**blueprint states** (contracts section):
```ts
export interface BrainAtom<TContext = Empty> {
  ask: <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: { ... },
    context?: TContext,
  ) => Promise<BrainOutput<TOutput, 'atom', TPlugs>>;
}
```

**consistency check**:
- wish → vision: ✓ vision shows factory bound with concrete context type
- vision → criteria: ✓ criteria tests what vision describes
- criteria → blueprint: ✓ blueprint implements what criteria specifies

**verdict**: ✓ consistent flow through all documents

---

### check 2: user feedback integration

**user feedback** (from prior session):
> "Actor context should use generic `TContext = Empty`, not loose `Record<string, unknown>` — users should be able to prescribe what context they want to demand."

**blueprint states** (codepath tree):
```
actorAsk<TContext = Empty>
├─ [~] input: add optional context?: TContext
│     note: generic allows callers to prescribe what context they demand
```

**verification**:
- blueprint uses `TContext = Empty`, not `Record<string, unknown>`: ✓ matches feedback
- note explicitly references "prescribe what context they demand": ✓ matches feedback language
- same pattern applied to actorAct and genActor: ✓ consistent

**verdict**: ✓ user feedback correctly integrated

---

### check 3: optional by mandate consistency

**wish states** (lines 35-40):
```ts
[K in `brain.supplier.${TSlug}`]?: TSupplies;
// optional by mandate — forces consideration of context without supplier's supplies
```

**vision states** (pit-of-success section):
```ts
// context['brain.supplier.xai'] is always TSupplies | undefined
// implementers must handle the absent case — no way to forget
```

**criteria states** (usecase.3):
```
when consumer calls ask without context
  then context is undefined
    sothat brain can check and handle absent supplies
```

**blueprint states** (contracts section):
```ts
[K in `brain.supplier.${TSlug}`]?: TSupplies
```

**verification**:
- `?:` present in blueprint type definition: ✓
- semantics match wish description: ✓
- usecase.3 covers absent-context case: ✓

**verdict**: ✓ optional by mandate correctly implemented

---

## edge case verification

### edge case 1: multiple supplier contexts

**wish states** (resolved questions):
```ts
ContextBrainSupplier<'xai', XaiSupplies> & ContextBrainSupplier<'anthropic', AnthropicSupplies>
```

**blueprint coverage**:
- type definition supports intersection via template literal keys
- different slugs → different keys → no collision
- not explicitly tested in blueprint test coverage section

**resolution**: this is covered implicitly via type structure. the intersection type compiles because keys are distinct (`brain.supplier.xai` vs `brain.supplier.anthropic`). the type tests for "key structure" can verify this. no gap.

**verdict**: ✓ supported via type semantics

---

### edge case 2: Empty default backwards compatibility

**criteria states** (usecase.4):
```
when the factory returns BrainAtom without generic
  then typescript infers BrainAtom<Empty>
  then the ask method accepts context?: Empty
```

**blueprint states** (backwards compatibility section):
```
- BrainAtom without generic infers BrainAtom<Empty>
- context?: Empty accepts {} or undefined
```

**verification**:
- `TContext = Empty` default on interface: ✓
- Empty type from type-fns accepts `{}` or undefined: ✓ (extant behavior)
- extant callers pass no context: ✓ continues to work

**verdict**: ✓ backwards compatible

---

### edge case 3: class generic matches interface generic

**codebase pattern** (from ContextBrain.ts):
```ts
export interface ContextBrain<TBrainChoice = BrainChoice | null> { ... }
export class ContextBrain<TBrainChoice = BrainChoice | null>
  extends DomainLiteral<ContextBrain<TBrainChoice>>
  implements ContextBrain<TBrainChoice> { ... }
```

**blueprint states** (codepath tree):
```
BrainAtom<TContext = Empty>
├─ [~] interface BrainAtom<TContext = Empty>
├─ [~] class BrainAtom<TContext = Empty>
│     extends DomainEntity<BrainAtom<TContext>>
│     implements BrainAtom<TContext>
```

**verification**:
- interface has `<TContext = Empty>`: ✓
- class has `<TContext = Empty>`: ✓
- DomainEntity generic includes TContext: ✓ (`BrainAtom<TContext>`)
- implements clause includes TContext: ✓ (`BrainAtom<TContext>`)
- same pattern as ContextBrain.ts: ✓

**verdict**: ✓ follows extant class-interface pattern

---

### edge case 4: genContextBrainSupplier cast requirement

**blueprint states** (contracts section):
```ts
return { [`brain.supplier.${supplier}`]: supplies } as ContextBrainSupplier<TSlug, TSupplies>;
```

**why cast required**:
- template literal computed property `[`brain.supplier.${supplier}`]` loses type precision
- typescript infers `Record<string, TSupplies>` instead of mapped type
- `as` cast restores correct type

**verified via prior reviews**: r4 confirmed this is correct behavior per typescript semantics. not a deviation from wish — wish did not specify implementation detail.

**verdict**: ✓ cast is technically required, documented in blueprint

---

## potential drift points

### drift point 1: context param placement

**wish signature**:
```ts
ask: <TOutput, TPlugs>(input, context?: TContext) => ...
```

**blueprint signature**:
```ts
ask: <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
  input: { ... },
  context?: TContext,
) => Promise<BrainOutput<TOutput, 'atom', TPlugs>>;
```

**check**: context is second param, after input, and is optional (`context?:`). ✓ matches wish.

---

### drift point 2: actor context thread

**criteria states** (usecase.6):
```
when consumer calls actor.ask with context
  then context is passed to the brain
```

**blueprint states**:
```
actorAsk<TContext = Empty>
├─ [~] impl: pass context to brain.ask(..., context)
```

**check**: implementation explicitly passes context to brain.ask. ✓ matches criteria.

---

## issues found and fixed

### none

no issues found in this round. all blueprint elements adhere to:
- wish specification (line-by-line match from r7)
- vision description (day-in-the-life matches contracts)
- criteria usecases (all 7 usecases covered)
- user feedback (generic TContext = Empty for actors)
- extant patterns (class-interface generic pattern from ContextBrain.ts)

---

## conclusion

| verification area | status | notes |
|-------------------|--------|-------|
| wish → vision → criteria → blueprint flow | ✓ | consistent through all documents |
| user feedback integration | ✓ | TContext = Empty, not Record |
| optional by mandate | ✓ | ?. present and semantics match |
| multiple supplier contexts | ✓ | supported via intersection types |
| Empty default backwards compat | ✓ | extant callers unaffected |
| class generic matches interface | ✓ | follows ContextBrain.ts pattern |
| genContextBrainSupplier cast | ✓ | technically required per TS |
| context param placement | ✓ | second param, optional |
| actor context thread | ✓ | explicitly passes to brain |

blueprint correctly adheres to behavior declaration. no drift detected.

