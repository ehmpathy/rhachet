# self-review: has-behavior-coverage (r1)

## wish behavior

from `0.wish.md`:
> the slug on 'enter secret for' and 'get' are different
> the root cause is because the root keyrack is for org `ahbode` but the nested, extended keyrack is for org `rhight`
> we'd carry the original org all the way through

**behavior:** fill should store keys under the org from their slug, not the root manifest's org.

**test:** `fillKeyrackKeys.integration.test.ts` [case8] cross-org extends

```ts
expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');
expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
```

**covered:** yes - test verifies extended key under rhight org, root key under ahbode org.

## vision behaviors

### behavior 1: slug is source of truth

from `1.vision.md`:
> the slug **is** the source of truth for org. when the manifest says `rhight.prod.USPTO_ODP_API_KEY`, that's where it should be stored and retrieved.

**test:** `fillKeyrackKeys.integration.test.ts` [case8]
- creates extended manifest with org: rhight
- creates root manifest with org: ahbode and extends directive
- verifies USPTO_ODP_API_KEY stored under rhight, not ahbode

**covered:** yes

### behavior 2: cross-org extends table

from `1.vision.md`:
> | key | declared in | stored under |
> |-----|-------------|--------------|
> | AWS_PROFILE | ahbode (root) | ahbode.prod.AWS_PROFILE |
> | USPTO_ODP_API_KEY | rhight (extended) | rhight.prod.USPTO_ODP_API_KEY |

**test:** `fillKeyrackKeys.integration.test.ts` [case8]
- DB_PASSWORD (root key) → `ahbode.prod.DB_PASSWORD`
- USPTO_ODP_API_KEY (extended key) → `rhight.prod.USPTO_ODP_API_KEY`

**covered:** yes (uses DB_PASSWORD instead of AWS_PROFILE, functionally equivalent)

### behavior 3: asKeyrackKeyOrg extraction

from `1.vision.md` (root cause):
> extract org from slug

**test:** `asKeyrackKeyOrg.test.ts`
- case1: extracts org from standard slug
- case2: handles dots in key name

**covered:** yes

## summary

| behavior | source | test file | test case | covered |
|----------|--------|-----------|-----------|---------|
| fill stores under slug org | wish | fillKeyrackKeys.integration.test.ts | [case8] | yes |
| slug is source of truth | vision | fillKeyrackKeys.integration.test.ts | [case8] | yes |
| cross-org extends | vision | fillKeyrackKeys.integration.test.ts | [case8] | yes |
| asKeyrackKeyOrg extraction | vision | asKeyrackKeyOrg.test.ts | [case1], [case2] | yes |

all behaviors from wish and vision have test coverage.
