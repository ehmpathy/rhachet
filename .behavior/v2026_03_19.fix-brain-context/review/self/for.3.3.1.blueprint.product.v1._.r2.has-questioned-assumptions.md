# self-review: has-questioned-assumptions (round 2)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md` (updated)

---

## issue found in round 1

class declarations need generic alongside interface declarations.

**fix applied**: updated codepath tree in blueprint:

```
BrainAtom<TContext = Empty>
├─ [~] interface BrainAtom<TContext = Empty>     # add generic
│     └─ ask(input, context?: TContext)
├─ [~] class BrainAtom<TContext = Empty>         # add generic to class
│     extends DomainEntity<BrainAtom<TContext>>
│     implements BrainAtom<TContext>
```

same update for BrainRepl.

---

## additional assumptions questioned (round 2)

### 7. assumption: `as` cast needed in genContextBrainSupplier

**question**: the blueprint shows:
```ts
return { [`brain.supplier.${supplier}`]: supplies } as ContextBrainSupplier<TSlug, TSupplies>;
```

is `as` cast necessary?

**evidence**: computed property keys with template literals lose type precision in TS. the cast is required to preserve the literal slug type. this follows extant pattern in genContextBrainChoice.

**verdict**: holds. cast is unavoidable for computed template literal keys.

---

### 8. assumption: no need for BrainAtom/BrainRepl class method implementations

**question**: do we need to update method implementations in the class, or just the declarations?

**evidence**: BrainAtom and BrainRepl classes extend DomainEntity which creates instances from interface shape. the actual `ask`/`act` implementations are provided by factory functions (genBrainAtom, genBrainRepl) in supplier packages, not in the class. the class is just a domain object wrapper.

**verdict**: holds. no method implementations to update — suppliers provide them.

---

### 9. assumption: actor needs TContext generic

**question**: should actorAsk/actorAct have their own TContext generic or use any?

**evidence**: actor doesn't know what brain it will invoke at compile time (it receives ActorBrain at runtime). with TContext generic the actor signature would declare what context type it expects, which defeats the purpose of dynamic brain selection.

better approach: actor accepts `context?: Record<string, unknown>` or a union type. the brain validates at runtime.

**found issue**: blueprint doesn't address how actor context type should be declared.

**fix (updated per wisher feedback)**: actor should use generic `TContext = Empty` so callers can prescribe what context they demand. blueprint updated:
```ts
export const actorAsk = async <TOutput, TContext = Empty>(
  input: { role: Role; brain: ActorBrain; prompt: string; schema: ... },
  context?: TContext,
)
```

the generic allows type safety while brain validates at runtime that its required context is present.

---

## conclusion

found one additional issue: actor context type needed clarification. per wisher feedback, actor should use generic `TContext = Empty` so callers can prescribe what context they demand. blueprint updated to reflect this.

all other assumptions from round 1 still hold after re-review.
