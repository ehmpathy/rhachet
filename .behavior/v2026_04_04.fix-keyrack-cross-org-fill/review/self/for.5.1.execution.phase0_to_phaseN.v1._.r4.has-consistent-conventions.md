# self-review: has-consistent-conventions (r4)

## detailed comparison

### implementation files

compared `asKeyrackKeyOrg.ts` with extant extractors:

```ts
// asKeyrackKeyEnv.ts (extant)
/**
 * .what = extract env from env-scoped slug
 * .why = fix messages need env to construct proper --env flag
 */
export const asKeyrackKeyEnv = (input: { slug: string }): string => {
  const parts = input.slug.split('.');
  return parts[1] ?? '';
};

// asKeyrackKeyOrg.ts (new)
/**
 * .what = extract org from env-scoped slug
 * .why = fill needs org to store keys under correct org
 */
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
  const parts = input.slug.split('.');
  return parts[0] ?? '';
};
```

structure is identical: jsdoc format, function signature, implementation pattern.

### test files

found two test patterns in the codebase:

| file | pattern |
|------|---------|
| asKeyrackKeyName.test.ts | data-driven TEST_CASES |
| asKeyrackKeySlug.test.ts | given/when/then |
| asKeyrackKeyOrg.test.ts | given/when/then |

my test follows the `asKeyrackKeySlug.test.ts` pattern. both patterns are valid in this codebase.

### integration test [case8]

compared with extant cases 1-7 in `fillKeyrackKeys.integration.test.ts`:

| aspect | extant cases | case8 |
|--------|--------------|-------|
| given label | `[caseN] description` | `[case8] cross-org extends...` |
| when label | `[tN] action` | `[t0] fill is called...` |
| scene setup | `useBeforeAll(async () => {...})` | same |
| assertions | `expect(result.summary...)` | same |

structure matches extant cases.

## conclusion

all conventions match. no divergence detected.

- `asKeyrackKeyOrg.ts` structure matches `asKeyrackKeyEnv.ts`
- `asKeyrackKeyOrg.test.ts` follows the `asKeyrackKeySlug.test.ts` pattern
- integration test [case8] follows the extant case structure
