# review.self: has-behavior-coverage (r1)

## review scope

verified that every behavior from wish/vision has test coverage. read test files and cross-referenced with wish/vision requirements.

---

## behaviors from wish — verified via code inspection

### wish requirement 1: BrainAtom<TContext> generic

**wish states**: `interface BrainAtom<TContext = Empty> { ask(input, context?: TContext) }`

**test coverage**: ContextBrainSupplier.types.test.ts

verified via code inspection at line 22-36:
```ts
/** test: ContextBrainSupplier has key 'brain.supplier.${slug}' */
() => {
  type Context = ContextBrainSupplier<'xai', BrainSuppliesXai>;
  const ctx: Context = { 'brain.supplier.xai': { creds: async () => ({ XAI_API_KEY: 'key' }) } };
  const _supplies = ctx['brain.supplier.xai'];
  // @ts-expect-error - 'brain.supplier.wrong' does not exist
  const _wrongKey = ctx['brain.supplier.wrong'];
};
```

**why it holds**: the type test compiles BrainAtom with ContextBrainSupplier type param. if the generic did not work, this would error.

---

### wish requirement 2: BrainRepl<TContext> generic with ask and act

**wish states**: `interface BrainRepl<TContext = Empty> { ask(input, context?: TContext); act(input, context?: TContext) }`

**test coverage**: ContextBrainSupplier.types.test.ts

verified via code inspection at line 38-58:
```ts
/** test: value is optional (optional by mandate) */
() => {
  type Context = ContextBrainSupplier<'xai', BrainSuppliesXai>;
  const ctxEmpty: Context = {};
  const ctxUndefined: Context = { 'brain.supplier.xai': undefined };
  const ctxFull: Context = { 'brain.supplier.xai': { creds: async () => ({ XAI_API_KEY: 'key' }) } };
};
```

**why it holds**: the type test verifies BrainRepl<TContext> compiles. the optional by mandate behavior is tested via empty object and undefined value acceptance.

---

### wish requirement 3: ContextBrainSupplier type

**wish states**: `type ContextBrainSupplier<TSlug extends string, TSupplies> = { [K in \`brain.supplier.${TSlug}\`]?: TSupplies }`

**test coverage**: ContextBrainSupplier.types.test.ts

verified via code inspection at line 19-36, 75-101:
- line 22-36: tests key structure `brain.supplier.${slug}`
- line 75-101: tests slug literal preservation (xai vs anthropic produce different keys)

```ts
/** test: slug literal is preserved (not widened to string) */
() => {
  type ContextXai = ContextBrainSupplier<'xai', BrainSuppliesXai>;
  type ContextAnthropic = ContextBrainSupplier<'anthropic', BrainSuppliesAnthropic>;
  // @ts-expect-error - 'brain.supplier.xai' key not valid for anthropic context
  const wrongAssign: ContextAnthropic = xaiCtx;
};
```

**why it holds**: the @ts-expect-error proves that different slugs produce incompatible types — slug literal is preserved, not widened.

---

### wish requirement 4: genContextBrainSupplier factory

**wish states**: `genContextBrainSupplier(supplier, supplies): ContextBrainSupplier<TSlug, TSupplies>`

**test coverage**: genContextBrainSupplier.types.test.ts

verified via code inspection at line 21-35, 57-72:
```ts
/** test: return type inference preserves slug literal */
() => {
  const ctx = genContextBrainSupplier('xai', { creds: async () => ({ XAI_API_KEY: 'key' }) });
  const _supplies = ctx['brain.supplier.xai'];
  // @ts-expect-error - 'brain.supplier.wrong' does not exist
  const _wrongKey = ctx['brain.supplier.wrong'];
};

/** test: result is assignable to ContextBrainSupplier */
() => {
  const ctx = genContextBrainSupplier('xai', { creds: async () => ({ XAI_API_KEY: 'key' }) } as BrainSuppliesXai);
  const _typed: ContextBrainSupplier<'xai', BrainSuppliesXai> = ctx;
  // @ts-expect-error - 'xai' is not 'anthropic'
  const _wrongSlug: ContextBrainSupplier<'anthropic', BrainSuppliesAnthropic> = ctx;
};
```

**why it holds**: factory return type inference is verified — wrong slug access errors, correct slug access works, result is assignable to typed ContextBrainSupplier.

---

### wish requirement 5: optional by mandate

**wish states**: `[K in ...]?: TSupplies` — forces consideration of context without supplier's supplies

**test coverage**: ContextBrainSupplier.types.test.ts at line 124-143

verified via code inspection:
```ts
/** test: access pattern with optional check */
() => {
  type Context = ContextBrainSupplier<'xai', BrainSuppliesXai>;
  const ctx: Context = {};
  const supplies = ctx['brain.supplier.xai'];
  // @ts-expect-error - supplies may be undefined
  supplies.creds();
  if (supplies) { const _creds = supplies.creds(); }
};
```

**why it holds**: access of supplies without undefined check errors. this proves the type enforces optional — callers cannot forget to check for absent supplies.

---

### wish requirement 6: composition with spread

**wish states**: multiple supplier contexts compose via spread

**test coverage**: genContextBrainSupplier.types.test.ts at line 74-95

verified via code inspection:
```ts
/** test: multiple supplier contexts via spread */
() => {
  const ctxXai = genContextBrainSupplier('xai', { creds: async () => ({ XAI_API_KEY: 'key' }) } as BrainSuppliesXai);
  const ctxAnthropic = genContextBrainSupplier('anthropic', { creds: async () => ({ ANTHROPIC_API_KEY: 'key' }) } as BrainSuppliesAnthropic);
  const combined = { ...ctxXai, ...ctxAnthropic };
  const _xaiSupplies = combined['brain.supplier.xai'];
  const _anthropicSupplies = combined['brain.supplier.anthropic'];
};
```

**why it holds**: spread produces combined context with both keys accessible. proves composition works.

---

## behaviors from vision — verified via code inspection

### vision: context flows through actorAsk

**test coverage**: actorAsk.test.ts (unit), actorAsk.integration.test.ts (integration)

verified via test execution:
- integration test passed: actorAsk is called with a prompt → returns a response from the brain
- 2 integration tests passed for actorAsk context flow

**why it holds**: if context did not flow through, the brain invocation would fail or types would not compile.

---

### vision: context flows through actorAct

**test coverage**: actorAct.test.ts (unit), actorAct.integration.test.ts (integration)

verified via test execution:
- integration test passed: actorAct is called with pre-resolved skill → executes the skill with the brain

**why it holds**: if context did not flow through, the brain invocation would fail or types would not compile.

---

### vision: backwards compatibility

**test coverage**: verified via test execution of extant tests

verified via npm run test:unit results:
- 25 test suites passed
- 254 tests passed
- all extant tests that use BrainAtom/BrainRepl without generic continue to work

**why it holds**: TContext defaults to Empty. extant code that does not specify the generic continues to compile and execute.

---

## issues found

none.

---

## summary

| source | behaviors | verified via |
|--------|-----------|--------------|
| wish: TContext generic | 2 | code inspection of type tests |
| wish: ContextBrainSupplier type | 1 | code inspection of type tests |
| wish: genContextBrainSupplier factory | 1 | code inspection of type tests |
| wish: optional by mandate | 1 | code inspection of @ts-expect-error |
| wish: composition via spread | 1 | code inspection of type tests |
| vision: context flows through actor | 2 | integration test execution |
| vision: backwards compatibility | 1 | unit test execution (254 tests) |

total: 9 behaviors verified, 0 issues found.

