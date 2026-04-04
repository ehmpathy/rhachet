# self-review r1: has-questioned-assumptions

## assumptions in the blueprint

### assumption 1: slug format is `$org.$env.$key`

**what we assume**: the first segment of any slug is always the org.

**evidence**:
- `asKeyrackKeyName.ts` (line 5-9) uses `slug.split('.').slice(2)` to get key name
- `getKeyrackKeyGrant.ts` (line 70-72) uses `slug.split('.')[0]` for org
- `hydrateKeyrackRepoManifest.ts` constructs slugs as `${org}.${env}.${key}`

**what if opposite were true?** if slug format varied, the fix would break.

**verdict**: holds ✓ — slug format is consistent across the codebase

---

### assumption 2: `slug.split('.')[0]!` is safe (non-null assertion)

**what we assume**: the first segment always exists.

**evidence**:
- slugs are constructed in hydration with explicit `${org}.${env}.${key}` format
- no slug can be empty or start with a dot
- hydration validates `explicit.org` is present before it constructs slugs

**what if opposite were true?** if a malformed slug reached this code, we'd get `undefined`. but hydration prevents this.

**verdict**: holds ✓ — hydration guarantees slug format

---

### assumption 3: the fix is isolated to line 257

**what we assume**: this is the only place where `repoManifest.org` is incorrectly used for extended keys.

**evidence**:
- research document greppeed for `repoManifest.org` usage
- `getKeyrackKeyGrant` uses slug directly (correct)
- `setKeyrackKey` takes explicit `org` input (pass-through, not the issue)
- the mismatch is between fill's call to set vs grant's slug-based lookup

**what if opposite were true?** if other places had similar bugs, the fix would be incomplete. but research confirms this is the only location.

**verdict**: holds ✓ — research validated single location

---

### assumption 4: test will catch the regression

**what we assume**: the test case is sufficient to verify the fix.

**evidence**:
- test sets up cross-org extends scenario (ahbode extends rhight)
- test verifies emit logs show correct org in prompts
- test verifies `result.summary.set` and `result.summary.failed`

**could a simpler approach work?** the test could be simpler if we only check `result.summary.failed === 0`. but we also check emit logs — this provides stronger verification that the correct org appears in prompts.

**verdict**: holds ✓ — test is comprehensive but not excessive

---

### assumption 5: no new helper function is needed

**what we assume**: inline `slug.split('.')[0]!` is better than a helper like `asKeyrackKeyOrg`.

**evidence**:
- `asKeyrackKeyName` exists to extract key name (more complex: `parts.slice(2).join('.')`)
- to extract org is simpler (just first segment)
- `getKeyrackKeyGrant` already uses inline extraction (line 70-72)

**could a simpler approach work?** a helper would add a file and import for a one-liner. the inline approach is already used in `getKeyrackKeyGrant`. consistency suggests inline is fine.

**verdict**: holds ✓ — inline is simpler and consistent with extant code

---

## summary

| assumption | verdict | reason |
|------------|---------|--------|
| slug format is `$org.$env.$key` | holds | consistent across codebase |
| non-null assertion is safe | holds | hydration guarantees format |
| fix is isolated to line 257 | holds | research validated single location |
| test catches regression | holds | checks emit logs and summary |
| no helper function needed | holds | inline is simpler, consistent |

all assumptions validated. no hidden issues found.
