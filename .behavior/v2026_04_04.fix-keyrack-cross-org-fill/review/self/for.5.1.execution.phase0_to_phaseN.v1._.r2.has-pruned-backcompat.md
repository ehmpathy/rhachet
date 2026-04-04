# self-review: has-pruned-backcompat (r2)

## the change

line 258 in fillKeyrackKeys.ts:
```ts
// before
org: repoManifest.org,

// after
org: asKeyrackKeyOrg({ slug }),
```

## backwards compat check

### question 1: did the wisher explicitly say to maintain any compatibility?

no. the wish describes a bug where cross-org extends stores keys under the wrong org. the wish asks to fix it, not to preserve the old behavior for any scenario.

### question 2: is there evidence this backwards compat is needed?

no. the old behavior was a bug:
- `rhight.prod.USPTO_ODP_API_KEY` was stored under `ahbode` (root org)
- `get` looked for it under `rhight` (from slug)
- roundtrip failed

there is no scenario where store-under-wrong-org is desirable.

### question 3: did we add any backwards compat shims "to be safe"?

no. the change is direct:
- no fallback to `repoManifest.org` if `asKeyrackKeyOrg` fails
- no deprecation warn
- no feature flag
- no "try new, catch, fallback to old"

### question 4: could there be callers that depend on the old behavior?

examined the code:
- `setKeyrackKey` receives `org` as input and uses it directly
- no other code path in `fillKeyrackKeys` uses `repoManifest.org` for key storage
- the slug already contains the correct org from manifest hydration

for single-org repos (no extends), `asKeyrackKeyOrg({ slug })` returns the same value as `repoManifest.org`, so behavior is identical. no backwards compat concern.

## conclusion

**no backwards compat shims were added.** the change is a direct bug fix. the old behavior was not a feature to preserve — it was a defect. no caller could depend on "store key under wrong org" as intended behavior.
