# self-review: role-standards-adherance (r7)

## briefs directories checked

enumerated all relevant briefs directories:
- `practices/code.prod/evolvable.procedures/` - function patterns
- `practices/code.prod/readable.comments/` - jsdoc requirements
- `practices/code.prod/pitofsuccess.typedefs/` - type correctness
- `practices/code.test/frames.behavior/` - test patterns
- `practices/lang.terms/` - name conventions
- `practices/lang.tones/` - style and tone

## deep compare: asKeyrackKeyOrg vs asKeyrackKeyEnv

the new function must match extant extractors exactly. compare line by line:

### jsdoc header (lines 1-4)

**extant (asKeyrackKeyEnv.ts):**
```ts
/**
 * .what = extract env from env-scoped slug
 * .why = fix messages need env to construct proper --env flag
 */
```

**new (asKeyrackKeyOrg.ts):**
```ts
/**
 * .what = extract org from env-scoped slug
 * .why = fill needs org to store keys under correct org
 */
```

**analysis:**
- identical structure: `/** ... */` block
- identical format: `.what =` and `.why =` on separate lines
- content differs only by what is extracted (env vs org)
- rule `rule.require.what-why-headers` satisfied

**holds:** jsdoc matches extant pattern exactly.

### function signature (line 5)

**extant:**
```ts
export const asKeyrackKeyEnv = (input: { slug: string }): string => {
```

**new:**
```ts
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
```

**analysis:**
- identical pattern: `export const as{Part} = (input: { slug: string }): string =>`
- uses arrow function (not `function` keyword) - rule `rule.require.arrow-only`
- uses input object pattern - rule `rule.require.input-context-pattern`
- explicit return type - rule `rule.require.shapefit`
- no context param (pure function, no deps needed)

**holds:** signature matches extant pattern exactly.

### implementation (lines 6-9)

**extant:**
```ts
  // slug format: $org.$env.$key
  // split on dot, take second part
  const parts = input.slug.split('.');
  return parts[1] ?? '';
```

**new:**
```ts
  // slug format: $org.$env.$key
  // split on dot, take first part
  const parts = input.slug.split('.');
  return parts[0] ?? '';
```

**analysis:**
- identical comment on line 6: `// slug format: $org.$env.$key`
- line 7 differs only by "first" vs "second" - matches array index
- line 8 identical: `const parts = input.slug.split('.');`
- line 9 differs only by array index: `parts[0]` vs `parts[1]`
- uses nullish coalesce `??` for safe fallback
- no mutation, no side effects - pure function

**holds:** implementation matches extant structure exactly with appropriate index.

## test file review: asKeyrackKeyOrg.test.ts

### structure compare

**extant pattern (from asKeyrackKeySlug.test.ts):**
- uses `given`/`when`/`then` from test-fns
- labels: `[case1]`, `[t0]`
- multiple assertions per then block

**new test structure:**
```ts
describe('asKeyrackKeyOrg', () => {
  given('[case1] a standard slug', () => {
    when('[t0] org is extracted', () => {
      then('returns the org segment', () => {
        expect(...).toEqual('rhight');
        expect(...).toEqual('ahbode');
      });
    });
  });

  given('[case2] a slug with dots in key name', () => {
    when('[t0] org is extracted', () => {
      then('returns only the first segment', () => {
        expect(...).toEqual('ehmpathy');
      });
    });
  });
});
```

**analysis:**
- single `describe` block wraps all tests - correct
- `given` blocks labeled with `[caseN]` - correct
- `when` blocks labeled with `[tN]` - correct
- `then` blocks describe outcome - correct
- case2 tests edge case (dots in key name) - robustness

**holds:** test structure follows mechanic standards.

## integration test review: fillKeyrackKeys.integration.test.ts [case8]

### test setup review (lines 659-690)

```ts
given('[case8] cross-org extends (root=ahbode, extended=rhight)', () => {
  const repo = useBeforeAll(async () => {
    // setup code
  });

  const manifest = useBeforeAll(async () => {
    // manifest setup
  });

  when('[t0] fill is called with env=prod', () => {
    then('stores USPTO_ODP_API_KEY under rhight org', async () => {
      // assertions
    });
  });
});
```

**analysis:**
- uses `useBeforeAll` for shared setup - rule `rule.require.useBeforeAll-for-setup`
- `given` label describes scenario clearly - follows extant cases 1-7
- `when` label describes action - matches pattern
- `then` label describes outcome - matches pattern
- no `let` declarations for test state - correct
- uses `emitSpy` for output verification - matches extant tests

**holds:** integration test follows mechanic standards.

## change to fillKeyrackKeys.ts

### diff review (line 258)

```diff
-            org: repoManifest.org,
+            org: asKeyrackKeyOrg({ slug }),
```

**analysis:**
- replaces hardcoded value with function call
- follows extant pattern: `asKeyrackKeyName({ slug })` already used at line 163
- function call uses input object pattern `{ slug }` - consistent
- no new imports needed beyond line 9

**holds:** change follows extant code patterns in this file.

## violations found

none.

## conclusion

deep review confirms adherance to mechanic role standards:

| aspect | extant pattern | new code | match |
|--------|----------------|----------|-------|
| jsdoc format | `.what` + `.why` | identical | exact |
| function signature | `(input: { slug }): string =>` | identical | exact |
| implementation | `split('.')[N] ?? ''` | identical structure | exact |
| test structure | given/when/then with labels | identical | exact |
| variable pattern | `const parts = ...` | identical | exact |
| integration test | useBeforeAll, emitSpy | identical | exact |

all new code mirrors extant patterns. no deviations from mechanic standards.
