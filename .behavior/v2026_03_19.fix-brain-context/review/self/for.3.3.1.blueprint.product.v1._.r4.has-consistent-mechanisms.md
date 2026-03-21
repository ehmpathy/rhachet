# self-review: has-consistent-mechanisms (round 4)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## mechanism review — new vs extant

for each new mechanism in the blueprint, verify it doesn't duplicate extant functionality.

---

### mechanism 1: genContextBrainSupplier factory

**what**: factory to create typed brain supplier contexts

**blueprint specifies**:
```ts
genContextBrainSupplier(supplier, supplies): ContextBrainSupplier<TSlug, TSupplies>
```

**search for extant**:
- searched `genContext*` patterns → found 44 files
- reviewed `genContextBrain.ts` — different purpose

**comparison**:

| mechanism | purpose | output |
|-----------|---------|--------|
| genContextBrain | brain discovery/choice | `{ brain: { choice, atom: { ask }, repl: { ask, act } } }` |
| genContextBrainSupplier | supplier credentials | `{ 'brain.supplier.<slug>': supplies }` |

**why not duplicated**:
- genContextBrain creates context to select and invoke brains
- genContextBrainSupplier creates context to supply credentials to brains
- different keys: `context.brain.*` vs `context['brain.supplier.*']`
- different purpose: discovery vs injection
- they compose via spread (as documented in wish line 73-89)

**verdict**: not duplicated. new mechanism for distinct purpose.

---

### mechanism 2: ContextBrainSupplier type

**what**: generic context type for brain suppliers

**blueprint specifies**:
```ts
type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
```

**search for extant**:
- searched `ContextBrainSupplier` → no files found
- searched `brain.supplier` → no files found (except wish document)

**why not duplicated**:
- no extant type serves this purpose
- wish explicitly requests this type (lines 31-40)
- key pattern `brain.supplier.<slug>` is new

**verdict**: not duplicated. new type explicitly requested in wish.

---

### mechanism 3: TContext generic on BrainAtom/BrainRepl

**what**: interface-level generic for context type

**search for extant**:
- reviewed `BrainAtom.ts` and `BrainRepl.ts` — no TContext generic extant
- extant signature: `context?: Empty`

**pattern match**:
- `ContextBrain<TAtom, TRepl>` uses interface-level generics
- `BrainAtom<TContext>` follows same pattern

**why not duplicated**:
- this is an *addition* to extant interfaces, not new mechanism
- follows extant pattern in codebase

**verdict**: not duplicated. addition to extant interfaces.

---

### mechanism 4: TContext generic on actor operations

**what**: actorAsk/actorAct accept `context?: TContext`

**search for extant**:
- reviewed actor operations — no context param extant
- actor.ask and actor.act don't currently accept context

**why not duplicated**:
- this is an *addition* to extant operations
- enables context flow to brain (usecase.6 in criteria)

**verdict**: not duplicated. addition to extant operations.

---

## conclusion

| mechanism | extant? | verdict |
|-----------|---------|---------|
| genContextBrainSupplier | no (different from genContextBrain) | new, not duplicated |
| ContextBrainSupplier | no (not found in codebase) | new, not duplicated |
| TContext on BrainAtom/BrainRepl | no (addition to extant) | extends extant |
| TContext on actor ops | no (addition to extant) | extends extant |

no new mechanisms duplicate extant functionality. the blueprint adds to extant patterns rather than reinvents them.

