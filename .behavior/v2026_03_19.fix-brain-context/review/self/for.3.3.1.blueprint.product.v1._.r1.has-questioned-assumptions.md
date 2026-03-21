# self-review: has-questioned-assumptions

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## assumptions surfaced and questioned

### 1. assumption: TContext = Empty is correct default

**question**: what if Empty is wrong default? what if undefined is better?

**evidence**: vision document explicitly states "TContext = Empty default" for backwards compat. Empty allows `{}` to pass, which is what genContextBrain currently sends.

**verdict**: holds. Empty is correct per spec and backwards compat.

---

### 2. assumption: interface-level generics, not method-level

**question**: what if TContext should be per-method instead of per-interface?

**evidence**: wish says "factories can bind their required context type at the return type":
```ts
genBrainAtom(...): BrainAtom<ContextBrainSupplierXai>
```

this requires interface-level generic. method-level would be:
```ts
genBrainAtom(...): BrainAtom // context type bound per ask() call
```

**verdict**: holds. interface-level is required by the spec.

---

### 3. assumption: only interface needs TContext generic

**found issue**: blueprint shows only interface change. but upon review of ContextBrain pattern:

```ts
export interface ContextBrain<TBrainChoice = BrainChoice | null> { ... }
export class ContextBrain<TBrainChoice = BrainChoice | null>
  extends DomainLiteral<ContextBrain<TBrainChoice>>
  implements ContextBrain<TBrainChoice> {}
```

the class declaration must also have the generic to match the interface.

**fix**: update blueprint codepath tree to show class changes:

```
BrainAtom<TContext = Empty>
├─ [~] interface BrainAtom<TContext = Empty>         # add generic
├─ [~] class BrainAtom<TContext = Empty>             # add generic to class too
│     extends DomainEntity<BrainAtom<TContext>>
│     implements BrainAtom<TContext>
└─ [○] retain static members
```

same for BrainRepl.

---

### 4. assumption: genContextBrain unchanged

**question**: does genContextBrain need to pass TContext through?

**evidence**: genContextBrain creates a ContextBrain wrapper that calls `atom.ask(askInput, {})` and `repl.ask(askInput, {})`. with TContext = Empty default, `{}` satisfies Empty. no change needed.

**verdict**: holds. genContextBrain remains unchanged.

---

### 5. assumption: actor context as optional param

**question**: should context be a separate param or part of input object?

**evidence**: extant pattern is `(input, context?)` per input-context pattern brief. context is always second param.

```ts
export const actorAsk = async <TOutput>(
  input: { role: Role; brain: ActorBrain; prompt: string; schema: ... },
  context?: TContext,
)
```

**verdict**: holds. follows (input, context) pattern.

---

### 6. assumption: compile-time type tests sufficient

**question**: do we need runtime tests for type behavior?

**evidence**: type tests verify contracts at compile time. integration tests verify runtime behavior (context actually flows through). both are needed.

**verdict**: holds. blueprint includes both type tests and integration tests.

---

## blueprint update required

the codepath tree must be updated to show class declarations also get the generic:

```
BrainAtom<TContext = Empty>
├─ [~] interface BrainAtom<TContext = Empty>
│     └─ ask(input, context?: TContext)
├─ [~] class BrainAtom<TContext = Empty>
│     extends DomainEntity<BrainAtom<TContext>>
│     implements BrainAtom<TContext>
└─ [○] retain static members
```

```
BrainRepl<TContext = Empty>
├─ [~] interface BrainRepl<TContext = Empty>
│     ├─ ask(input, context?: TContext)
│     └─ act(input, context?: TContext)
├─ [~] class BrainRepl<TContext = Empty>
│     extends DomainEntity<BrainRepl<TContext>>
│     implements BrainRepl<TContext>
└─ [○] retain static members
```

---

## conclusion

found one assumption issue: class declarations also need generic. blueprint updated conceptually above. all other assumptions hold with evidence.
