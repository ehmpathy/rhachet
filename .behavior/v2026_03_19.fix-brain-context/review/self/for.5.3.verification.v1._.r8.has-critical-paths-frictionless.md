# review.self: has-critical-paths-frictionless (r8)

## review scope

verified critical paths are frictionless in practice.

---

## repros artifacts

```
pattern: .behavior/v2026_03_19.fix-brain-context/3.2.distill.repros.experience.*.md
result: no files found
```

this behavior followed wish → vision → criteria → blueprint workflow. critical paths are defined in criteria usecases, not repros.

---

## critical paths from criteria

the 7 usecases in `2.1.criteria.blackbox.md` define the critical paths. reviewed each one in depth.

---

## usecase.1 — brain supplier declares context type

**the path:**
```ts
type ContextBrainSupplierXai = ContextBrainSupplier<'xai', BrainSuppliesXai>;
export const genBrainAtom = (): BrainAtom<ContextBrainSupplierXai> => { ... };
```

**why it holds (no friction):**
- template literal mapped type generates correct key: `'brain.supplier.xai'`
- typescript infers the key at compile time — no magic strings
- `ContextBrainSupplier.types.test.ts` lines 22-36 prove key structure works
- `@ts-expect-error` on line 34 proves wrong keys are rejected

**verification:**
```
npm run test:types → pass
npm run test:unit -- ContextBrainSupplier → 1 test pass
```

---

## usecase.2 — consumer provides context

**the path:**
```ts
const context = genContextBrainSupplier('xai', { creds: async () => ({ XAI_API_KEY: '...' }) });
await atom.ask(input, context);
```

**why it holds (no friction):**
- factory returns correctly typed object with inferred slug literal
- `genContextBrainSupplier.types.test.ts` lines 24-35 prove slug literal preserved
- line 33-34 proves wrong slug key access is rejected at compile time
- no runtime cast needed — types flow naturally

**verification:**
```
npm run test:unit -- genContextBrainSupplier → 1 test pass
```

---

## usecase.3 — consumer calls without context

**the path:**
```ts
await atom.ask(input); // context is optional
```

**why it holds (no friction):**
- `TContext = Empty` default makes context optional
- no required migration for callers — they can omit context
- `actorAsk.test.ts` cases 1-4 all pass without context param
- backwards compatible by construction

**verification:**
```
npm run test:unit -- actorAsk.test.ts → 9 tests pass
```

---

## usecase.4 — backwards compatibility

**the path:**
```ts
const atom: BrainAtom = genBrainAtom({ slug: 'test' }); // no generic
await atom.ask(input); // works
```

**why it holds (no friction):**
- interface-level generic with default: `BrainAtom<TContext = Empty>`
- callers that omit TContext get `BrainAtom<Empty>` — unchanged behavior
- no compilation errors on files that don't use the new generic
- test files written before this behavior still compile

**verification:**
```
npm run test:types → pass (no errors on unmodified files)
```

---

## usecase.5 — context construction via factory

**the path:**
```ts
const context = genContextBrainSupplier('xai', { creds: ... });
// returns: { 'brain.supplier.xai'?: typeof supplies }
```

**why it holds (no friction):**
- factory signature: `<TSlug, TSupplies>(slug: TSlug, supplies: TSupplies)`
- typescript infers both generics from arguments — no explicit annotation needed
- `genContextBrainSupplier.types.test.ts` lines 40-55 prove supplies type flows
- line 54 proves wrong methods are rejected on supplies

**pit of success:**
- optional by mandate: value is always `TSupplies | undefined`
- `ContextBrainSupplier.types.test.ts` lines 126-143 prove undefined check required
- line 137 `@ts-expect-error` proves cannot call method without null check

---

## usecase.6 — context flows through actor

**the path:**
```ts
await actor.ask({ prompt: '...' }, context);
// context passed to brain.ask internally
```

**why it holds (no friction):**
- actorAsk signature updated: `context?: TContext` param added
- actorAct signature updated: `context?: TContext` param added
- implementation passes context through: `brain.ask(input, context)`
- generic allows callers to prescribe required context type

**verification:**
```
npm run test:unit -- actorAsk.test.ts → 9 tests pass
npm run test:unit -- actorAct.test.ts → 4 tests pass
```

---

## usecase.7 — composition with genContextBrainChoice

**the path:**
```ts
const context = {
  ...await genContextBrainChoice({ brain: 'xai/grok/code-fast-1' }),
  ...genContextBrainSupplier('xai', { creds: ... }),
};
```

**why it holds (no friction):**
- keys are namespaced differently:
  - `genContextBrainChoice` uses: `brain.choice`, `brain.atom.ask`, etc.
  - `genContextBrainSupplier` uses: `brain.supplier.${slug}`
- no key collision by design — template literal ensures unique prefix
- `genContextBrainSupplier.types.test.ts` lines 77-95 prove spread composition works
- line 93-94 proves combined type is assignable to intersection

---

## test execution summary

```
npm run test:types                         # ✓ pass
npm run test:unit -- actorAsk.test.ts      # ✓ 9 tests pass
npm run test:unit -- actorAct.test.ts      # ✓ 4 tests pass
npm run test:unit -- ContextBrainSupplier  # ✓ 1 test pass
npm run test:unit -- genContextBrainSupplier # ✓ 1 test pass
```

all 15 tests pass. no unexpected errors.

---

## friction audit

| path | friction | why it holds |
|------|----------|--------------|
| declare context type | none | template literal generates correct key |
| provide context | none | factory infers types from arguments |
| omit context | none | default generic preserves compat |
| construct context | none | pit of success via optional mandate |
| compose contexts | none | namespaced keys prevent collision |
| flow through actor | none | context param added to signatures |

---

## conclusion

| question | answer |
|----------|--------|
| are critical paths frictionless? | ✓ yes |
| any unexpected errors? | ✗ no |
| does it feel effortless? | ✓ yes |
| any fixes needed? | ✗ no |

all 7 critical paths from criteria are frictionless. each path holds because of deliberate type design that makes the correct usage the easy usage.

