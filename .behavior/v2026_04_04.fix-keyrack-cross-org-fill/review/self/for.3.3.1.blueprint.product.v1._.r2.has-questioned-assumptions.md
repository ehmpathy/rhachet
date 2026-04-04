# self-review r2: has-questioned-assumptions

round 2 — fresh eyes on the assumptions review.

---

## re-read r1

r1 identified 5 assumptions:
1. slug format is `$org.$env.$key`
2. `slug.split('.')[0]!` is safe
3. fix is isolated to line 257
4. test will catch the regression
5. no new helper function is needed

all were marked as "holds". let me question them more deeply.

---

## deeper questions

### assumption 1: slug format

r1 cited evidence from 3 files. but did i verify the evidence?

let me trace: `hydrateKeyrackRepoManifest.ts` line 59 constructs slugs as `${org}.all.${key}` and line 80-86 constructs env-scoped slugs similarly.

**question**: what if a key name contains dots? e.g., `USPTO.ODP.API_KEY`

**answer**: key names can contain dots. the format is:
- segment 0 = org
- segment 1 = env
- segments 2+ = key name (joined by dots)

`asKeyrackKeyName` handles this correctly with `parts.slice(2).join('.')`.

the fix uses only segment 0, so multi-dot keys are fine.

**verdict**: holds ✓

---

### assumption 2: non-null assertion

r1 says hydration guarantees format. but what if a code path bypasses hydration?

**question**: can `fillKeyrackKeys` receive slugs that weren't hydrated?

**answer**: no. `fillKeyrackKeys` calls `getAllKeyrackSlugsForEnv`, which uses the hydrated `repoManifest.keys`. all slugs come from hydration.

**verdict**: holds ✓

---

### assumption 3: single location

r1 says research validated single location. but did the research grep all usages?

**question**: are there other callers of `setKeyrackKey` that pass `repoManifest.org`?

**answer**: the research document (3.1.3.research.internal.product.code.prod._.v1.i1.md) shows `setKeyrackKey` is called from:
- `fillKeyrackKeys.ts` line 257 — the bug location
- `setKeyrackKeyHost.ts` — takes explicit `--org` from CLI or `@this` expansion

`setKeyrackKeyHost` uses `orgExpanded` which comes from user input or manifest. this is intentional behavior for CLI set commands.

**verdict**: holds ✓ — only `fillKeyrackKeys` has the bug

---

### assumption 4: test coverage

r1 says test checks emit logs and summary. but is this sufficient?

**question**: does the test verify that the key was actually stored under the correct org in the vault?

**answer**: the test calls `fillKeyrackKeys` which does:
1. set key
2. unlock key
3. get key (roundtrip verification)

if any step fails, `result.summary.failed` would be non-zero. the test asserts `result.summary.failed === 0`, so roundtrip verification passed.

the emit log check (`'rhight.prod.USPTO_ODP_API_KEY'`) verifies the prompt showed the correct org.

**verdict**: holds ✓ — test covers roundtrip verification

---

### assumption 5: no helper

r1 says inline is simpler. but what about consistency?

**question**: should we create `asKeyrackKeyOrg` for consistency with `asKeyrackKeyName` and `asKeyrackKeyEnv`?

**answer**: there is no `asKeyrackKeyEnv` function. `getKeyrackKeyGrant` extracts both org and env inline (line 70-72). the pattern is: inline extraction when simple, helper when complex.

`asKeyrackKeyName` exists because extraction is complex (`parts.slice(2).join('.')`).
`asKeyrackKeyOrg` would be trivial (`parts[0]`).

**verdict**: holds ✓ — inline is consistent with extant pattern

---

## summary

all 5 assumptions re-validated with deeper questions. no issues found.

| assumption | r1 verdict | r2 verdict | notes |
|------------|------------|------------|-------|
| slug format | holds | holds | multi-dot keys handled |
| non-null assertion | holds | holds | hydration guarantees |
| single location | holds | holds | research validated |
| test coverage | holds | holds | roundtrip verification |
| no helper | holds | holds | inline is extant pattern |
