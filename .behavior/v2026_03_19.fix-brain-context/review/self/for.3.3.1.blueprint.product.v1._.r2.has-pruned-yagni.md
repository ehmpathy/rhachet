# self-review: has-pruned-yagni (round 2)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## YAGNI review

### 1. TContext generic on BrainAtom/BrainRepl — needed?

**prescribed**: yes. wish explicitly states:
> "add interface-level `TContext` generic to `BrainAtom<TContext = Empty>` and `BrainRepl<TContext = Empty>`"

**minimal**: yes. interface-level generic is the simplest way to bind context type at definition time.

**verdict**: needed.

---

### 2. ContextBrainSupplier type — needed?

**prescribed**: yes. wish explicitly states:
> "publish ContextBrainSupplier type"

with the exact shape:
```ts
type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
```

**minimal**: yes. this is the exact type from the wish.

**verdict**: needed.

---

### 3. genContextBrainSupplier factory — needed?

**prescribed**: yes. wish explicitly states:
> "publish genContextBrainSupplier factory"

with the exact signature:
```ts
genContextBrainSupplier(supplier, supplies): ContextBrainSupplier<TSlug, TSupplies>
```

**minimal**: yes. simple factory with one responsibility.

**verdict**: needed.

---

### 4. actor context flow — needed?

**prescribed**: yes. blackbox criteria usecase.6:
> "context flows through actor"

**minimal**: yes. just adds TContext generic and passes through.

**verdict**: needed.

---

### 5. type tests — needed?

**prescribed**: yes. vision mentions compile-time type tests. blackbox criteria usecases 1-5 are "verified at compile time".

**minimal**: yes. type tests are the standard pattern in this codebase.

**verdict**: needed.

---

### 6. integration tests for actor — needed?

**prescribed**: yes. blackbox criteria usecase.6 and 7 require runtime verification:
> "context flows to brain" (usecase.6)
> "composition with genContextBrainChoice" (usecase.7)

**minimal**: yes. integration tests are the standard for runtime verification.

**verdict**: needed.

---

### 7. ContextBrainSupplier.types.test.ts — separate file needed?

**question**: could fold into BrainAtom.types.test.ts?

**evidence**: codebase pattern shows each domain object has its own types test file. ContextBrainSupplier is a new domain object in domain.objects/.

**verdict**: needed. follows codebase pattern.

---

### 8. genContextBrainSupplier.types.test.ts — separate file needed?

**question**: could fold into ContextBrainSupplier.types.test.ts?

**evidence**: codebase pattern shows type tests for domain objects vs operations are separate. genContextBrainSupplier is in domain.operations/.

**verdict**: needed. follows codebase pattern.

---

## extras NOT in wish — candidates for removal

### reviewed for extras

| component | in wish? | in criteria? | verdict |
|-----------|----------|--------------|---------|
| TContext generic | yes | yes (usecase.1) | keep |
| ContextBrainSupplier type | yes | yes (usecase.5) | keep |
| genContextBrainSupplier | yes | yes (usecase.5) | keep |
| actor TContext | yes | yes (usecase.6) | keep |
| type tests | yes | implicit | keep |
| integration tests | yes | yes (usecase.6-7) | keep |

**no extras found.** every component traces to wish or criteria.

---

## conclusion

the blueprint contains exactly what was prescribed. no YAGNI violations found. no components added "for future flexibility" or "while we're here".

