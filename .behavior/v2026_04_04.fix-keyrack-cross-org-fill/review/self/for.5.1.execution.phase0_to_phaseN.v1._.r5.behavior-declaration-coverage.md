# self-review: behavior-declaration-coverage (r5)

## line-by-line verification

### vision requirement: "slug is source of truth for org"

**code:**
```ts
// fillKeyrackKeys.ts:258
org: asKeyrackKeyOrg({ slug }),
```

**verified:** the org is extracted from the slug, not from `repoManifest.org`.

### vision requirement: cross-org extends table

from vision:
> | key | declared in | stored under |
> |-----|-------------|--------------|
> | AWS_PROFILE | ahbode (root) | ahbode.prod.AWS_PROFILE |
> | USPTO_ODP_API_KEY | rhight (extended) | rhight.prod.USPTO_ODP_API_KEY |

**test code:**
```ts
// fillKeyrackKeys.integration.test.ts:737-741
// USPTO_ODP_API_KEY from extended manifest should be under rhight org
expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');

// DB_PASSWORD from root manifest should be under ahbode org
expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
```

**verified:** the test verifies both scenarios.

### blueprint component 1: asKeyrackKeyOrg.ts

**code:**
```ts
// asKeyrackKeyOrg.ts:1-10
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
  const parts = input.slug.split('.');
  return parts[0] ?? '';
};
```

**verified:** function exists with correct signature.

### blueprint component 2: asKeyrackKeyOrg.test.ts

**code:**
```ts
// asKeyrackKeyOrg.test.ts:6-16
given('[case1] a standard slug', () => {
  when('[t0] org is extracted', () => {
    then('returns the org segment', () => {
      expect(asKeyrackKeyOrg({ slug: 'rhight.prod.USPTO_KEY' })).toEqual('rhight');
      expect(asKeyrackKeyOrg({ slug: 'ahbode.test.AWS_PROFILE' })).toEqual('ahbode');
    });
  });
});
```

**verified:** unit tests exist and cover standard and edge cases.

### blueprint component 3: fillKeyrackKeys.ts change

**before:**
```ts
org: repoManifest.org,
```

**after:**
```ts
org: asKeyrackKeyOrg({ slug }),
```

**verified:** line 258 uses `asKeyrackKeyOrg({ slug })`.

### blueprint component 4: integration test [case8]

**code:**
```ts
// fillKeyrackKeys.integration.test.ts:659-744
given('[case8] cross-org extends (root=ahbode, extended=rhight)', () => {
  // setup: extended keyrack (org: rhight) with USPTO_ODP_API_KEY
  // setup: root keyrack (org: ahbode) with DB_PASSWORD

  when('[t0] fill is called with env=prod', () => {
    then('stores USPTO_ODP_API_KEY under rhight org', async () => {
      // ...
      expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');
      expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
    });
  });
});
```

**verified:** test exists and covers both keys with correct orgs.

## gaps found

none.

## conclusion

all requirements verified line by line:
- vision: slug is source of truth — implemented at line 258
- vision: cross-org table — tested in [case8]
- blueprint: all 4 components implemented and verified
