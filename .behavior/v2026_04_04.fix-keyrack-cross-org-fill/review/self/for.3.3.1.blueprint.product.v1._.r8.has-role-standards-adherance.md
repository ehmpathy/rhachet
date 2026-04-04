# self-review r8: has-role-standards-adherance

review for mechanic role standards adherence.

---

## step 1: enumerate relevant brief directories

the blueprint touches:
1. production code (`fillKeyrackKeys.ts`)
2. test code (`fillKeyrackKeys.integration.test.ts`)

relevant brief categories:
- `code.prod/evolvable.procedures/` — function patterns
- `code.prod/pitofsuccess.typedefs/` — type safety
- `code.test/frames.behavior/` — test structure

---

## step 2: check production code standards

### rule: require-input-context-pattern

**blueprint code**:
```ts
const orgFromSlug = slug.split('.')[0]!;
await setKeyrackKey({
  key: keyName,
  env: input.env,
  org: orgFromSlug,
  ...
}, contextKeyrack);
```

**check**: does the fix break the input-context pattern?

**answer**: no. the fix adds a local variable and modifies an argument. the function signature is unchanged.

✓ holds

### rule: require-arrow-only

**blueprint code**: no new functions added.

✓ not applicable

### rule: forbid-as-cast

**blueprint code**: uses `!` (non-null assertion), not `as`.

**check**: is `!` acceptable?

**answer**: yes. `!` asserts non-null, not type cast. the value is guaranteed non-null by the split operation.

✓ holds

---

## step 3: check test code standards

### rule: require-given-when-then

**blueprint test**:
```ts
given('[case8] cross-org extends (root=ahbode, extended=rhight)', () => {
  when('[t0] fill is called with env=prod', () => {
    then('stores USPTO_ODP_API_KEY under rhight org', async () => {
```

**check**: does the test follow given-when-then structure?

**answer**: yes. given describes scenario, when describes action, then describes outcome.

✓ holds

### rule: test case label pattern

**check**: does `[case8]` follow the `[caseN]` convention?

**answer**: yes.

**check**: does `[t0]` follow the `[tN]` convention?

**answer**: yes.

✓ holds

---

## step 4: check code style standards

### rule: forbid-gerunds

**blueprint code**: `orgFromSlug` — no gerunds.

✓ holds

### rule: prefer-lowercase

**blueprint code**: all lowercase identifiers.

✓ holds

---

## summary

| standard | status |
|----------|--------|
| input-context pattern | ✓ unchanged |
| arrow-only | ✓ n/a |
| forbid-as-cast | ✓ uses `!` not `as` |
| given-when-then | ✓ structure correct |
| case label pattern | ✓ [case8], [t0] |
| forbid-gerunds | ✓ no gerunds |
| prefer-lowercase | ✓ all lowercase |

no violations found. blueprint adheres to mechanic role standards.

