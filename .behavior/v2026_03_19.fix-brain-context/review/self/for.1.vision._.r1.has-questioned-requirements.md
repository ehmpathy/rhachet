# self-review: has-questioned-requirements

## requirement 1: generic context on BrainAtom.ask()

### who said this was needed? when? why?

the wish comes from rhachet-brains-xai development. the handoff explicitly states the need arose when the team implemented credential suppliers for xai — they needed typed context but `context?: Empty` blocked it.

### what evidence supports this requirement?

- **code evidence**: `BrainAtom.ts:75` and `BrainRepl.ts:70,94` show `context?: Empty` hardcoded
- **practical evidence**: the parrot fixture in `blackbox/.test/assets/rhachet-brains-parrot/` already works around this by not handling context at all
- **pattern evidence**: the codebase already uses `(input, context)` pattern extensively — brains are the exception

### what if we didn't do this?

brain suppliers would continue to:
- use env vars (implicit, hard to test)
- create wrapper factories (ad-hoc, don't compose)
- fight typescript with `as any` (unsafe)

the friction is real and measurable.

### is the scope too large, too small, or misdirected?

the scope is **correctly sized**:
- change from `Empty` → `TContext = Empty` is minimal diff
- backwards compatible by default
- enables future flexibility without over-engineered solution now

### could we achieve the goal in a simpler way?

**alternatives considered**:

1. **use globals/env vars**: simpler but violates DI principle, hard to test
2. **wrapper factory pattern**: each supplier invents their own, doesn't compose
3. **pass context in input**: violates `(input, context)` convention

the generic context approach is the simplest that maintains consistency with the codebase's patterns.

**verdict**: ✅ requirement holds

---

## requirement 2: publish ContextBrainSupplier type

### who said this was needed? when? why?

the wish specifies this type to provide a standard shape for supplier contexts. without it, each supplier would invent their own convention for names.

### what evidence supports this requirement?

- **pattern evidence**: terraform providers use namespaced provider config
- **collision risk**: if suppliers used `context.xai` directly, it could collide with other context keys
- **discoverability**: `brain.supplier.<slug>` is self-documented

### what if we didn't do this?

suppliers would either:
- use keys without namespace (collision risk)
- invent their own namespace convention (inconsistent)
- or just pass credentials in input (breaks convention)

### is the scope too large, too small, or misdirected?

the scope is **correctly sized**:
- it's a type alias, not runtime code
- provides standard without enforcement
- suppliers can still use their own types if they want

### could we achieve the goal in a simpler way?

**simpler alternative**: don't publish this type, let suppliers define their own.

**problem**: inconsistency. if we want suppliers to compose (e.g., actor that uses multiple brains), a standard type matters.

**verdict**: ✅ requirement holds — the standardization value outweighs the minimal complexity cost

---

## requirement 3: publish genContextBrainSupplier factory

### who said this was needed? when? why?

the wish specifies this factory to provide a pit-of-success for context construction.

### what evidence supports this requirement?

- **pit-of-success pattern**: the codebase uses `gen*` factories extensively
- **ergonomics**: manual construction of `{ [`brain.supplier.${slug}`]: supplies }` is error-prone
- **typescript inference**: factory can infer types from arguments

### what if we didn't do this?

consumers would construct manually:

```ts
const context = { [`brain.supplier.xai`]: { creds } } as ContextBrainSupplier<'xai', Supplies>;
```

this is verbose and requires explicit type annotation.

### is the scope too large, too small, or misdirected?

the scope is **correctly sized**:
- small utility function, ~3 lines of implementation
- provides ergonomic value without added complexity
- optional — consumers can still construct manually

### could we achieve the goal in a simpler way?

**simpler alternative**: don't publish factory, just document manual construction.

**problem**: manual construction requires the user to know the template literal syntax and cast. the factory is trivially simple but provides real ergonomic value.

**verdict**: ✅ requirement holds — factory is minimal yet valuable

---

## meta-review: vision document quality

### does the vision match the wish?

yes. the vision:
- illustrates before/after clearly
- addresses all three requirements from the wish
- identifies open questions for validation

### what's absent?

1. **no mention of BrainRepl.act**: the wish says "ask and act" but the vision focuses on ask. act should work identically but should be explicitly stated.

2. **actor context pass-through unclear**: the vision asks "should context flow through actor.ask/actor.act?" — this is a valid open question but the vision could sketch what that looks like.

### issues found and fixed

| issue | status | how fixed |
|-------|--------|-----------|
| BrainRepl.act not mentioned | noted | will address in criteria phase |
| actor context pass-through | noted as open question | appropriate — needs wisher input |

---

## conclusion

all three requirements hold after review:

1. **generic context**: necessary, correctly scoped, consistent with codebase patterns
2. **ContextBrainSupplier type**: provides standardization value at minimal cost
3. **genContextBrainSupplier factory**: provides ergonomic value at minimal cost

the vision accurately represents the wish and identifies appropriate open questions for validation.
