# self-review: has-ergonomics-validated (r9)

## the core question

> does the actual input/output match what felt right at repros?

## step 1: locate planned ergonomics

**repros artifact**: none (wish `0.wish.md` is the source)

## step 2: planned output from wish

**0.wish.md lines 8-18** (before fix):

```
🔑 key 1/2, USPTO_ODP_API_KEY, for 1 owner
   └─ for owner default
      ├─ set the key
      │  └─ enter secret for ahbode.prod.USPTO_ODP_API_KEY: ********
      └─ get after set, to verify
         └─ ✗ rhx keyrack get --key USPTO_ODP_API_KEY --env prod
```

**vision** (after fix):

```
🔑 key 1/2, USPTO_ODP_API_KEY, for 1 owner
   └─ for owner default
      ├─ set the key
      │  └─ enter secret for rhight.prod.USPTO_ODP_API_KEY: ********
      └─ get after set, to verify
         └─ ✓ rhx keyrack get --key USPTO_ODP_API_KEY --env prod
```

the key difference: prompt shows `rhight.prod` instead of `ahbode.prod`.

## step 3: trace actual output through code

### where the prompt is generated

**vault adapter** (`vaultAdapterOsSecure.ts` line 125):
```ts
prompt: `enter secret for ${input.slug}: `,
```

the prompt uses `input.slug` from the vault adapter input.

### where input.slug comes from

**setKeyrackKeyHost.ts** receives slug from caller:
```ts
export const setKeyrackKeyHost = async (
  input: {
    slug: string;  // line 25
    ...
  },
```

**setKeyrackKey.ts** constructs the slug (line 37):
```ts
const targetSlugs = [`${input.org}.${input.env}.${input.key}`];
```

then passes to setKeyrackKeyHost (line 46):
```ts
const keyHost = await setKeyrackKeyHost({
  slug,  // from targetSlugs
  ...
});
```

### where input.org comes from

**fillKeyrackKeys.ts** (line 258, the fix):
```ts
await setKeyrackKey(
  {
    key: keyName,
    env: input.env,
    org: asKeyrackKeyOrg({ slug }),  // <-- the fix
    ...
  },
  contextKeyrack,
);
```

**asKeyrackKeyOrg** extracts org from slug:
```ts
const parts = input.slug.split('.');
return parts[0] ?? '';
```

### trace for USPTO_ODP_API_KEY (cross-org extends)

| step | location | value |
|------|----------|-------|
| slug in fillKeyrackKeys | manifest hydration | `rhight.prod.USPTO_ODP_API_KEY` |
| org extracted | `asKeyrackKeyOrg({ slug })` | `rhight` |
| targetSlug constructed | setKeyrackKey.ts:37 | `rhight.prod.USPTO_ODP_API_KEY` |
| slug passed to vault | setKeyrackKeyHost.ts:46 | `rhight.prod.USPTO_ODP_API_KEY` |
| prompt shown | vaultAdapterOsSecure.ts:125 | `enter secret for rhight.prod.USPTO_ODP_API_KEY: ` |

**actual output** for USPTO_ODP_API_KEY: `enter secret for rhight.prod.USPTO_ODP_API_KEY`

**planned output** (from vision): `enter secret for rhight.prod.USPTO_ODP_API_KEY`

**match**: yes

### trace for DB_PASSWORD (root manifest key)

| step | location | value |
|------|----------|-------|
| slug in fillKeyrackKeys | manifest hydration | `ahbode.prod.DB_PASSWORD` |
| org extracted | `asKeyrackKeyOrg({ slug })` | `ahbode` |
| targetSlug constructed | setKeyrackKey.ts:37 | `ahbode.prod.DB_PASSWORD` |
| slug passed to vault | setKeyrackKeyHost.ts:46 | `ahbode.prod.DB_PASSWORD` |
| prompt shown | vaultAdapterOsSecure.ts:125 | `enter secret for ahbode.prod.DB_PASSWORD: ` |

root manifest keys remain under their original org (no change, as expected).

## step 4: verify via test assertions

**fillKeyrackKeys.integration.test.ts** case8 (lines 734-741):

```ts
const slugs = result.results.map((r) => r.slug);

// USPTO_ODP_API_KEY from extended manifest should be under rhight org
expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');

// DB_PASSWORD from root manifest should be under ahbode org
expect(slugs).toContain('ahbode.prod.DB_PASSWORD');
```

these assertions verify the output matches the planned ergonomics:
- USPTO_ODP_API_KEY stored under `rhight` (its declared org)
- DB_PASSWORD stored under `ahbode` (its declared org)

## step 5: compare planned vs actual

| aspect | planned (vision) | actual (traced) | match? |
|--------|------------------|-----------------|--------|
| USPTO_ODP_API_KEY prompt | `enter secret for rhight.prod.USPTO_ODP_API_KEY` | `enter secret for rhight.prod.USPTO_ODP_API_KEY` | yes |
| USPTO_ODP_API_KEY store | `rhight.prod.USPTO_ODP_API_KEY` | `rhight.prod.USPTO_ODP_API_KEY` | yes |
| DB_PASSWORD prompt | `enter secret for ahbode.prod.DB_PASSWORD` | `enter secret for ahbode.prod.DB_PASSWORD` | yes |
| DB_PASSWORD store | `ahbode.prod.DB_PASSWORD` | `ahbode.prod.DB_PASSWORD` | yes |
| verify command | `✓ rhx keyrack get` | passes (failed=0) | yes |

## step 6: check for design drift

**vision proposed**:
```ts
const orgFromSlug = slug.split('.')[0]!;
```

**actual implementation**:
```ts
org: asKeyrackKeyOrg({ slug })
```

where:
```ts
export const asKeyrackKeyOrg = (input: { slug: string }): string => {
  const parts = input.slug.split('.');
  return parts[0] ?? '';
};
```

**drift**: none. the logic is identical. the extraction into a named function is a structural choice for consistency with `asKeyrackKeyEnv` and `asKeyrackKeyName`.

## conclusion

| check | result | evidence |
|-------|--------|----------|
| planned input | `rhx keyrack fill --env prod` | unchanged |
| actual input | `rhx keyrack fill --env prod` | unchanged |
| planned output (prompt) | `enter secret for rhight.prod.USPTO_ODP_API_KEY` | from vision |
| actual output (prompt) | `enter secret for rhight.prod.USPTO_ODP_API_KEY` | traced through code |
| design drift | none | same logic, named function |
| ergonomics validated | yes | planned matches actual |

the actual input/output matches the planned ergonomics. the prompt shows the correct org from the slug, the key is stored under the correct org, and roundtrip verification succeeds.
