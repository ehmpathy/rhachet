# self-review: behavior-declaration-adherence (r5)

## diff review

reviewed `git diff main` for all changed files.

### fillKeyrackKeys.ts

**diff:**
```diff
+import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';
...
-            org: repoManifest.org,
+            org: asKeyrackKeyOrg({ slug }),
```

**blueprint says:**
> line 257: org: repoManifest.org → org: asKeyrackKeyOrg({ slug })

**verification:**
- import added — correct
- line change at correct location (line 258, was 257 before import) — correct
- uses exact pattern from blueprint — correct

### asKeyrackKeyOrg.ts

**blueprint says:**
```ts
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
  const parts = input.slug.split('.');
  return parts[0] ?? '';
};
```

**actual code:**
```ts
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
  const parts = input.slug.split('.');
  return parts[0] ?? '';
};
```

**verification:** exact match.

### asKeyrackKeyOrg.test.ts

**blueprint says:**
```ts
given('[case1] a standard slug', () => {
  when('[t0] org is extracted', () => {
    then('returns the org segment', () => {
      expect(asKeyrackKeyOrg({ slug: 'rhight.prod.USPTO_KEY' })).toEqual('rhight');
      expect(asKeyrackKeyOrg({ slug: 'ahbode.test.AWS_PROFILE' })).toEqual('ahbode');
    });
  });
});
```

**verification:** test matches blueprint structure.

### fillKeyrackKeys.integration.test.ts [case8]

**blueprint says:**
> add: cross-org extends test case

**verification:**
- [case8] exists at lines 659-744
- tests both ahbode.prod.DB_PASSWORD and rhight.prod.USPTO_ODP_API_KEY
- matches the usecase from vision

## deviations found

none. all implementations match the spec exactly.

## conclusion

all changes adhere to the behavior declaration:
- fillKeyrackKeys.ts: exact change as prescribed
- asKeyrackKeyOrg.ts: exact function as prescribed
- asKeyrackKeyOrg.test.ts: follows test structure from blueprint
- integration test [case8]: covers the cross-org scenario
