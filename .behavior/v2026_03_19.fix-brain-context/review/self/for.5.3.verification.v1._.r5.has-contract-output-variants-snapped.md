# review.self: has-contract-output-variants-snapped (r5)

## review scope

checked whether public contracts from this behavior have snapshot coverage for output variants.

---

## contracts from this behavior

per blueprint, this behavior adds:

| contract | type | nature |
|----------|------|--------|
| `ContextBrainSupplier<TSlug, TSupplies>` | type | compile-time |
| `genContextBrainSupplier(slug, supplies)` | factory | compile-time return type |
| `BrainAtom<TContext>` | interface generic | compile-time |
| `BrainRepl<TContext>` | interface generic | compile-time |
| `actorAsk` context param | function signature | compile-time |
| `actorAct` context param | function signature | compile-time |

---

## analysis

all contracts are **compile-time type contracts**, not runtime output contracts.

### what snapshots verify

per the guide: "snapshots enable vibecheck in prs — reviewers see actual output without execute"

snapshots capture **runtime output**:
- CLI: stdout/stderr strings
- UI: rendered screens
- SDK: response objects from async operations

### what type tests verify

type tests capture **compile-time contracts**:
- type inference works correctly
- generic parameters flow correctly
- @ts-expect-error assertions catch invalid usage

### why snapshots are n/a for this behavior

the contracts are type-level:

```ts
// this is a type, not a runtime value
type ContextBrainSupplier<TSlug, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies
}

// this factory's value is its TYPE, not its runtime output
const context = genContextBrainSupplier('xai', { creds });
// context is typed as { 'brain.supplier.xai'?: typeof supplies }
// the type IS the contract — runtime value is trivial ({ key: value })
```

there is no meaningful runtime output to snapshot:
- `genContextBrainSupplier('xai', { creds })` returns `{ 'brain.supplier.xai': { creds } }`
- the value is trivial; the TYPE is what matters
- type tests verify the type; snapshot would just show `{ key: value }`

---

## evidence: type tests exist

```
src/domain.objects/ContextBrainSupplier.types.test.ts
src/domain.operations/context/genContextBrainSupplier.types.test.ts
```

these tests verify:
- key structure via template literal inference
- optional by mandate (slug key always optional)
- slug inference (literal type preserved)
- return type inference

---

## conclusion

| question | answer |
|----------|--------|
| are there public contracts? | ✓ yes, 6 contracts |
| are they runtime contracts? | ✗ no, all compile-time type contracts |
| do runtime contracts need snapshots? | n/a — no runtime contracts |
| are type contracts tested? | ✓ yes, via type tests |

snapshots are n/a for this behavior — all contracts are compile-time type contracts verified via type tests.

