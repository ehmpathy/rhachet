# self-review: behavior-declaration-adherance (r6)

## diff review

reviewed `git diff main -- src/` for all changed files.

### file 1: fillKeyrackKeys.ts

**diff:**
```diff
+import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';
...
-            org: repoManifest.org,
+            org: asKeyrackKeyOrg({ slug }),
```

**blueprint says:**
> line 257: org: repoManifest.org -> org: asKeyrackKeyOrg({ slug })

**vision says:**
> the slug **is** the source of truth for org. when the manifest says `rhight.prod.USPTO_ODP_API_KEY`, that's where it should be stored and retrieved.

**verification:**
- import added at line 9 (previously line 8) - correct
- change at line 258 (previously line 257, shifted by import) - correct
- uses `asKeyrackKeyOrg({ slug })` instead of `repoManifest.org` - correct
- the `slug` variable is defined at line 166: `const slug = key;` where key comes from the repo manifest keys
- the repo manifest keys are already resolved with correct org from extends hydration
- therefore, extract of org from slug preserves the correct org for extended manifests

**holds:** implementation matches spec exactly.

### file 2: asKeyrackKeyOrg.ts

**blueprint says:**
```ts
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
  const parts = input.slug.split('.');
  return parts[0] ?? '';
};
```

**actual code at lines 5-9:**
```ts
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
  // slug format: $org.$env.$key
  // split on dot, take first part
  const parts = input.slug.split('.');
  return parts[0] ?? '';
};
```

**verification:**
- function signature matches: `(input: { slug: string }): string`
- implementation matches: splits on `.`, returns `parts[0] ?? ''`
- jsdoc present at lines 1-4 with `.what` and `.why` - matches brief convention
- comments inside function explain the slug format - added clarity, not deviation

**holds:** implementation matches spec with added documentation.

### file 3: asKeyrackKeyOrg.test.ts

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

**actual code at lines 6-16:**
```ts
given('[case1] a standard slug', () => {
  when('[t0] org is extracted', () => {
    then('returns the org segment', () => {
      expect(asKeyrackKeyOrg({ slug: 'rhight.prod.USPTO_KEY' })).toEqual(
        'rhight',
      );
      expect(asKeyrackKeyOrg({ slug: 'ahbode.test.AWS_PROFILE' })).toEqual(
        'ahbode',
      );
    });
  });
});
```

**verification:**
- structure matches: `given`/`when`/`then` pattern
- labels match: `[case1]`, `[t0]`
- assertions match: same slugs and expected values
- only difference is line format (line breaks for length) - stylistic, not deviation

**additional test at lines 19-27:**
- `[case2]` tests slug with dots in key name
- verifies `API.KEY.V2` returns only `ehmpathy` (first segment)
- this is a robustness test not in blueprint but valid

**holds:** implementation matches spec with additional edge case test.

### file 4: fillKeyrackKeys.integration.test.ts

**blueprint says:**
> add: cross-org extends test case

**actual code at lines 658-744:**
```ts
given('[case8] cross-org extends (root=ahbode, extended=rhight)', () => {
  // creates extended keyrack (org: rhight) with USPTO_ODP_API_KEY
  // creates root keyrack (org: ahbode) with DB_PASSWORD via extends
  when('[t0] fill is called with env=prod', () => {
    then('stores USPTO_ODP_API_KEY under rhight org', async () => {
      // ...
      expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');
      expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
    });
  });
});
```

**vision usecase table says:**
> | key | declared in | stored under |
> |-----|-------------|--------------|
> | AWS_PROFILE | ahbode (root) | ahbode.prod.AWS_PROFILE |
> | USPTO_ODP_API_KEY | rhight (extended) | rhight.prod.USPTO_ODP_API_KEY |

**verification:**
- test setup creates two keyrack manifests:
  - extended at `.agent/repo=rhight/role=patenter/keyrack.yml` with org: rhight
  - root at `.agent/keyrack.yml` with org: ahbode and extends directive
- test asserts both keys in correct orgs:
  - `rhight.prod.USPTO_ODP_API_KEY` (from extended)
  - `ahbode.prod.DB_PASSWORD` (from root)
- note: test uses `DB_PASSWORD` instead of `AWS_PROFILE` for root key - functionally equivalent
- the core behavior tested matches vision: each key stored under the org that declared it

**holds:** test covers the cross-org scenario from vision.

## deviations found

none. all implementations match the spec exactly.

| file | spec | implementation | status |
|------|------|----------------|--------|
| fillKeyrackKeys.ts | line 257 change | line 258 (shifted by import) | exact match |
| asKeyrackKeyOrg.ts | function signature + body | exact match + jsdoc | exact match |
| asKeyrackKeyOrg.test.ts | case1 structure | exact match + case2 | exact match + bonus |
| fillKeyrackKeys.integration.test.ts | cross-org test | case8 with correct assertions | exact match |

## conclusion

all changes adhere to the behavior declaration:
- vision: slug is source of truth for org - implemented at line 258
- vision: cross-org extends table - tested in [case8]
- blueprint: all 4 file changes implemented correctly
- blueprint: contracts and signatures match spec
