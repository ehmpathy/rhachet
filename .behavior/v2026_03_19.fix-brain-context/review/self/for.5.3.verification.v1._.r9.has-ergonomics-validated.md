# review.self: has-ergonomics-validated (r9)

## review scope

verified that implemented input/output matches what was planned in vision and criteria.

---

## repros artifacts

```
pattern: .behavior/v2026_03_19.fix-brain-context/3.2.distill.repros.experience.*.md
result: no files found
```

this behavior followed wish → vision → criteria → blueprint workflow. ergonomics were planned in vision, not repros.

---

## comparison: vision vs implementation

reviewed each contract for input/output drift.

---

### ContextBrainSupplier type

**planned (vision lines 42, 108-112):**
```ts
export type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
```

**implemented (`ContextBrainSupplier.ts` lines 13-15):**
```ts
export type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
```

**drift?** none. exact match.

**why it holds:**
- the mapped type syntax is the only way to achieve template literal keys
- the `?:` optional modifier enforces "optional by mandate" from the wish
- generics `<TSlug, TSupplies>` are standard typescript patterns
- no alternative design would be simpler or clearer

**lesson:** when the spec is precise (wish line 108-112), implementation matches exactly.

---

### genContextBrainSupplier factory

**planned (vision lines 72-74, consumer usage):**
```ts
genContextBrainSupplier('xai', {
  creds: async () => ({ XAI_API_KEY: await vault.get('XAI_API_KEY') }),
})
```

**implemented (`genContextBrainSupplier.ts` lines 18-25):**
```ts
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
  supplier: TSlug,
  supplies: TSupplies,
): ContextBrainSupplier<TSlug, TSupplies> => {
  return {
    [`brain.supplier.${supplier}`]: supplies,
  } as ContextBrainSupplier<TSlug, TSupplies>;
};
```

**drift?** minor. parameter name: `slug` → `supplier`.

**why it holds (and why the drift is an improvement):**
- vision showed usage, not definition — `(slug, supplies)` was informal
- implementation uses `supplier` to match `ContextBrainSupplier` naming
- `supplier` is self-documenting: it's the brain supplier's identifier
- `slug` is overloaded (brain slugs, role slugs, etc.)

**lesson:** implementation should use domain-specific names even if vision used generic names. the vision describes what, implementation decides how to name.

---

### BrainAtom interface generic

**planned (vision lines 45-62):**
```ts
BrainAtom<ContextBrainSupplierXai>
```

**implemented (`BrainAtom.ts`):**
```ts
export interface BrainAtom<TContext = Empty> {
  ask: <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: { ... },
    context?: TContext,
  ) => Promise<BrainOutput<TOutput, 'atom', TPlugs>>;
}
```

**drift?** none. interface-level generic as planned.

**why it holds:**
- generic at interface level (not method level) ensures supplier binds at definition time
- `= Empty` default preserves backwards compatibility
- `context?: TContext` makes context optional but typed

**lesson:** interface-level generics are correct when the type is known at definition time, not per-call.

---

### BrainRepl interface generic

**planned (wish lines 7-14):**
```ts
interface BrainRepl<TContext = Empty> {
  ask: <TOutput, TPlugs>(input, context?: TContext) => Promise<...>
  act: <TOutput, TPlugs>(input, context?: TContext) => Promise<...>
}
```

**implemented (`BrainRepl.ts`):**
```ts
export interface BrainRepl<TContext = Empty> {
  ask: <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: { ... },
    context?: TContext,
  ) => Promise<BrainOutput<TOutput, 'repl', TPlugs>>;

  act: <TOutput, TPlugs extends BrainPlugs = BrainPlugs>(
    input: { ... },
    context?: TContext,
  ) => Promise<BrainOutput<TOutput, 'repl', TPlugs>>;
}
```

**drift?** none. both ask and act have context param.

**why it holds:**
- BrainRepl mirrors BrainAtom pattern (consistency)
- both ask and act need context for credential injection
- `= Empty` default on both methods via interface generic

**lesson:** symmetric interfaces are easier to reason about.

---

### actor context flow

**planned (vision lines 96-99):**
```ts
await actor.ask({ prompt: '...' }, context);
```

**implemented (`actorAsk.ts`):**
```ts
export const actorAsk = async <TContext = Empty>(
  input: { ... },
  context?: TContext,
): Promise<...> => {
  return brain.ask({ ... }, context);
};
```

**drift?** none. context param added and passed through.

**why it holds:**
- `TContext = Empty` default preserves backwards compatibility
- generic at function level allows callers to prescribe context type
- passthrough to `brain.ask(..., context)` is minimal change

**lesson:** threading context through requires function-level generics (not interface-level) because actor wraps any brain.

---

### composition with genContextBrainChoice

**planned (wish lines 92-108):**
```ts
const context = {
  ...await genContextBrainChoice({ brain: 'xai/grok/code-fast-1' }),
  ...genContextBrainSupplier('xai', { creds: ... }),
};
```

**implemented:** type tests prove spread composition works (lines 77-95 of `genContextBrainSupplier.types.test.ts`).

**drift?** none. namespaced keys avoid collision.

**why it holds:**
- `genContextBrainChoice` uses keys like `brain.choice`, `brain.atom.ask`
- `genContextBrainSupplier` uses keys like `brain.supplier.xai`
- template literal ensures prefix `brain.supplier.` is unique
- spread operator merges without overwrite

**lesson:** namespaced keys enable composition without coordination.

---

## ergonomic improvements discovered

| aspect | vision | implementation | why better |
|--------|--------|----------------|------------|
| param name | `slug` | `supplier` | domain-specific, matches type name |
| jsdoc | brief | full examples | shows pit-of-success usage |
| type tests | not planned | 10 tests | proves contracts hold at compile time |

---

## conclusion

| question | answer |
|----------|--------|
| does input match plan? | ✓ yes |
| does output match plan? | ✓ yes |
| any drift? | minor: `slug` → `supplier` (improvement) |
| ergonomics validated? | ✓ yes |

**lessons learned:**
1. precise specs produce exact matches
2. implementation can improve on vision's informal naming
3. interface-level vs function-level generics serve different use cases
4. namespaced keys enable safe composition

all planned ergonomics are implemented. the drift is an improvement.

