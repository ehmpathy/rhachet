# self-review: has-consistent-mechanisms (round 5)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## round 5 depth — verified r4 findings

r4 concluded no duplications. r5 verifies each found result with deeper scrutiny.

---

### mechanism 1: genContextBrainSupplier — verified distinct from genContextBrain

**r4 claim**: genContextBrainSupplier doesn't duplicate genContextBrain

**verification via code review**:

genContextBrain (extant) creates:
```ts
{
  brain: {
    choice: brain,
    atom: { ask: ... },
    repl: { ask: ..., act: ... }
  }
}
```

genContextBrainSupplier (new) creates:
```ts
{
  'brain.supplier.xai': {
    creds: () => Promise<{ XAI_API_KEY: string }>
  }
}
```

**key differences**:
1. **different consumers**: genContextBrain consumed by skills to discover brains; genContextBrainSupplier consumed by brains to receive credentials
2. **different lifecycle**: genContextBrain called when skill starts; genContextBrainSupplier called when brain needs credentials
3. **different data**: genContextBrain contains brain instances; genContextBrainSupplier contains credential factories
4. **different keys**: nested object `context.brain.*` vs flat key `context['brain.supplier.*']`

**why this holds**: the wish explicitly documents composition (lines 73-89):
```ts
const context: ContextSkillXai = {
  ...await genContextBrainChoice({ brain: 'xai/grok/code-fast-1' }),
  ...genContextBrainSupplier('xai', { creds: ... }),
};
```

if they were duplicative, they couldn't compose via spread. their distinctness is by design.

**verdict**: holds. r4 result verified.

---

### mechanism 2: ContextBrainSupplier type — verified new

**r4 claim**: no extant type serves this purpose

**verification via codebase search**:
- `ContextBrainSupplier` → 0 matches (confirmed)
- `brain.supplier` → 0 matches in src/ (confirmed)
- similar patterns: searched for `Context*Supplier` → no matches
- searched for mapped key types like `[K in \`prefix.${T}\`]` → found ContextBrain uses this pattern

**why this holds**: the wish provides the exact type definition (lines 31-40). it's explicitly requested, not derived. the mapped key pattern exists in codebase (ContextBrain uses it), so we follow extant pattern.

**verdict**: holds. r4 result verified.

---

### mechanism 3: TContext generic on BrainAtom/BrainRepl — verified extends extant

**r4 claim**: addition to extant interfaces, not new mechanism

**verification via pattern match**:
- reviewed ContextBrain.ts → uses `<TAtom = BrainAtom, TRepl = BrainRepl>`
- same pattern: interface-level generic with default
- BrainAtom.ts extant → no TContext generic (confirmed via research stone)

**why this holds**: we're not here to create a new mechanism. we apply an extant pattern (interface-level generics with defaults) to extant interfaces.

**verdict**: holds. r4 result verified.

---

### mechanism 4: TContext generic on actor operations — verified extends extant

**r4 claim**: addition to extant operations, not new mechanism

**verification via codebase review**:
- actorAsk.ts currently: no context param
- actorAct.ts currently: no context param
- genActor.ts currently: ask/act don't accept context

**why this holds**: we extend the operation signatures to accept context. the mechanism (pass context through call chain) follows standard DI patterns already used elsewhere in codebase (e.g., `(input, context)` pattern in domain.operations).

**verdict**: holds. r4 result verified.

---

## edge cases considered

### could we reuse genContextBrain instead of genContextBrainSupplier?

**no**. genContextBrain:
- takes a brain slug
- returns context with brain instances for invocation
- consumed by skills

genContextBrainSupplier:
- takes a supplier slug + supplies object
- returns context with credential factories
- consumed by brains

they serve different purposes in different parts of the call chain.

### could ContextBrainSupplier extend ContextBrain?

**no**. they're orthogonal:
- ContextBrain: `{ brain: { choice, atom, repl } }` — brain discovery
- ContextBrainSupplier: `{ 'brain.supplier.<slug>': supplies }` — credential injection

they compose via intersection, not extension.

---

## conclusion

all r4 results verified:

| mechanism | r4 result | r5 verification |
|-----------|-----------|-----------------|
| genContextBrainSupplier | distinct from genContextBrain | ✓ different consumers, lifecycle, data, keys |
| ContextBrainSupplier | new type | ✓ not found in codebase, explicitly requested |
| TContext on BrainAtom/BrainRepl | extends extant | ✓ applies extant generic pattern |
| TContext on actor ops | extends extant | ✓ follows extant DI pattern |

no duplications found. blueprint adds to extant patterns consistently.

