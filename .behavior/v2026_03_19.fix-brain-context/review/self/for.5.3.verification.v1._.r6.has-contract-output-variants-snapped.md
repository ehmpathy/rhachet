# review.self: has-contract-output-variants-snapped (r6)

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

## why snapshots are n/a

### the guide asks about runtime output

per the guide: "snapshots enable vibecheck in prs — reviewers see actual output without execute"

snapshots capture **runtime output**:
- CLI: stdout/stderr strings
- UI: rendered screens
- SDK: **response objects from async operations**

### these contracts are compile-time

all 6 contracts are **type-level contracts**:

1. **ContextBrainSupplier** — a type alias with template literal key
2. **genContextBrainSupplier** — factory whose value is its inferred TYPE, not its trivial runtime output
3. **BrainAtom<TContext>** / **BrainRepl<TContext>** — interface generics
4. **actorAsk/actorAct context param** — function signature changes

### runtime output would be meaningless

```ts
// genContextBrainSupplier returns:
{ 'brain.supplier.xai': { creds: [Function] } }

// this is trivial — the TYPE is what matters, not the runtime shape
// snapshot would just show { key: value } — no vibecheck value
```

the actual contract is the **inferred type**:
```ts
ContextBrainSupplier<'xai', { creds: () => Promise<{ XAI_API_KEY: string }> }>
```

type tests verify this via @ts-expect-error assertions. no runtime output exists to snapshot.

---

## evidence: type tests exist

read files:
- `src/domain.objects/ContextBrainSupplier.types.test.ts`
- `src/domain.operations/context/genContextBrainSupplier.types.test.ts`

these verify:
- template literal key structure (`brain.supplier.${slug}`)
- optional by mandate (slug key is always `?`)
- slug literal preserved (not widened to `string`)
- return type inference matches input types

---

## comparison: when snapshots ARE needed

| contract type | example | snapshot needed? |
|--------------|---------|------------------|
| CLI output | `rhachet init` stdout | ✓ yes |
| SDK response | `brain.ask()` return value | ✓ yes |
| type signature | `BrainAtom<TContext>` | ✗ no — type tests |
| factory return type | `genContextBrainSupplier()` | ✗ no — type tests |

this behavior has no CLI or SDK response contracts — only type contracts.

---

## conclusion

| question | answer |
|----------|--------|
| are there public contracts? | ✓ yes, 6 contracts |
| do any produce runtime output? | ✗ no, all compile-time types |
| would snapshots add value? | ✗ no — trivial `{ key: value }` |
| how are contracts verified? | type tests with @ts-expect-error |

snapshots n/a — all contracts are compile-time type contracts verified via type tests.

