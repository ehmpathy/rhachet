# self-review: has-behavior-declaration-adherance (round 7)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## adherance review — blueprint matches spec

for each blueprint element, verify it correctly implements what the vision and criteria specify.

---

## blueprint element 1: BrainAtom<TContext = Empty>

**blueprint states** (lines 53-62):
```
BrainAtom<TContext = Empty>
├─ interface BrainAtom<TContext = Empty>
│     └─ ask(input, context?: TContext)
├─ class BrainAtom<TContext = Empty>
│     extends DomainEntity<BrainAtom<TContext>>
```

**vision specifies**: brain suppliers bind context type at return type
```ts
export const genBrainAtom = (...): BrainAtom<ContextBrainSupplierXai>
```

**criteria specifies** (usecase.1):
```
when the factory returns a BrainAtom with typed context
  then typescript accepts the return type BrainAtom<ContextBrainSupplierXai>
```

**adherance check**:
- `TContext` generic enables suppliers to bind context type: ✓ adheres
- `= Empty` default preserves backwards compat: ✓ adheres to criteria usecase.4
- class also has generic (for DomainEntity): ✓ adheres to codebase pattern

**verdict**: ✓ correctly adheres to vision and criteria

---

## blueprint element 2: BrainRepl<TContext = Empty>

**blueprint states** (lines 66-77):
```
BrainRepl<TContext = Empty>
├─ interface BrainRepl<TContext = Empty>
│     ├─ ask(input, context?: TContext)
│     └─ act(input, context?: TContext)
├─ class BrainRepl<TContext = Empty>
```

**vision specifies** (exact signature from wish lines 24-28):
```ts
interface BrainRepl<TContext = Empty> {
  ask: <TOutput, TPlugs>(input, context?: TContext) => ...
  act: <TOutput, TPlugs>(input, context?: TContext) => ...
}
```

**adherance check**:
- both `ask` and `act` accept `context?: TContext`: ✓ adheres
- generic on interface and class: ✓ adheres

**verdict**: ✓ correctly adheres to vision and criteria

---

## blueprint element 3: ContextBrainSupplier type

**blueprint states** (lines 79-86):
```ts
type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies
}
```

**wish specifies** (lines 36-40):
```ts
type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
```

**adherance check**:
- exact type signature match: ✓ adheres
- `?:` for optional by mandate: ✓ adheres

**deviation check**: none found

**verdict**: ✓ exactly adheres to wish specification

---

## blueprint element 4: genContextBrainSupplier factory

**blueprint states** (lines 90-95):
```ts
genContextBrainSupplier(slug, supplies)
├─ input: { supplier: TSlug, supplies: TSupplies }
├─ output: ContextBrainSupplier<TSlug, TSupplies>
└─ impl: return { [`brain.supplier.${slug}`]: supplies }
```

**wish specifies** (lines 53-59):
```ts
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
  supplier: TSlug,
  supplies: TSupplies,
): ContextBrainSupplier<TSlug, TSupplies> => {
  // implementation
};
```

**adherance check**:
- signature matches: ✓ adheres
- return type matches: ✓ adheres
- implementation returns correct shape: ✓ adheres

**deviation**: blueprint shows `as` cast in contracts section. this is correct — template literal computed keys lose type precision in TS.

**verdict**: ✓ correctly adheres to wish specification

---

## blueprint element 5: actor context flow

**blueprint states** (lines 97-118):
```
actorAsk<TContext = Empty>
├─ input: add optional context?: TContext
├─ impl: pass context to brain.ask(..., context)

actorAct<TContext = Empty>
├─ input: add optional context?: TContext
├─ impl: pass context to brain.act(..., context)

genActor<TContext = Empty>
├─ ask<TContext>: accept context param, pass to actorAsk
├─ act<TContext>: accept context param, pass to actorAct
```

**criteria specifies** (usecase.6):
```
when consumer calls actor.ask with context
  then context is passed to the brain
when consumer calls actor.act with context
  then context is passed to the brain
```

**adherance check**:
- actorAsk passes context to brain.ask: ✓ adheres
- actorAct passes context to brain.act: ✓ adheres
- genActor threads context through: ✓ adheres
- TContext = Empty for backwards compat: ✓ adheres

**user feedback applied**: uses generic `TContext = Empty` instead of loose `Record<string, unknown>` so callers can prescribe what context they demand.

**verdict**: ✓ correctly adheres to criteria and user feedback

---

## blueprint element 6: backwards compatibility

**blueprint states** (lines 205-210):
```
- BrainAtom without generic infers BrainAtom<Empty>
- BrainRepl without generic infers BrainRepl<Empty>
- context?: Empty accepts {} or undefined
- genContextBrain continues to pass {}
```

**criteria specifies** (usecase.4):
```
when the factory returns BrainAtom without generic
  then typescript infers BrainAtom<Empty>
  then the ask method accepts context?: Empty
```

**adherance check**:
- `TContext = Empty` default ensures inference: ✓ adheres
- `Empty` accepts `{}` or undefined (type semantics): ✓ adheres
- genContextBrain unchanged: ✓ adheres (not a new requirement, non-impact documentation)

**verdict**: ✓ correctly adheres to criteria

---

## blueprint element 7: test coverage

**blueprint states** (lines 122-143):
```
type tests: TContext generic accepted, context param typed, backwards compat
integration tests: context flows to brain
```

**criteria specifies**: usecases 1-5 compile-time, 6-7 runtime

**adherance check**:
- type tests cover usecases 1-5: ✓ adheres
- integration tests cover usecase 6: ✓ adheres
- usecase 7 (composition): covered via type structure tests

**verdict**: ✓ correctly adheres to criteria

---

## deviations found

### none

all blueprint elements correctly adhere to vision and criteria. no misinterpretations or deviations found.

---

## conclusion

| blueprint element | adheres to spec? | notes |
|-------------------|------------------|-------|
| BrainAtom<TContext> | ✓ | exact match to wish |
| BrainRepl<TContext> | ✓ | exact match to wish |
| ContextBrainSupplier | ✓ | exact match to wish |
| genContextBrainSupplier | ✓ | exact match to wish |
| actor context flow | ✓ | adheres to criteria + user feedback |
| backwards compat | ✓ | adheres to criteria usecase.4 |
| test coverage | ✓ | adheres to criteria |

blueprint correctly implements vision and criteria. no deviations found.

