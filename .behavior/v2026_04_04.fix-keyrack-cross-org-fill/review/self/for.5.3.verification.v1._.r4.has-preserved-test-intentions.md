# self-review: has-preserved-test-intentions (r4)

## method: line-by-line compare against main

verified via direct compare of branch code to main branch code for all extant tests.

## case1 verification

### assertions on main (lines 183-193)
```ts
expect(result.summary.set).toEqual(0);
expect(result.summary.skipped).toEqual(1);
expect(result.summary.failed).toEqual(0);
expect(skipLog).toContain('testorg.all.API_KEY');
```

### assertions on branch (lines 183-193)
```ts
expect(result.summary.set).toEqual(0);
expect(result.summary.skipped).toEqual(1);
expect(result.summary.failed).toEqual(0);
expect(skipLog).toContain('testorg.all.API_KEY');
```

**compare result**: identical. zero changes to case1 assertions.

### intention preserved?
- **before**: test verifies env=all fallback skips re-set
- **after**: test verifies env=all fallback skips re-set
- **verdict**: intention unchanged

## cases 2-7 verification

### git diff shows no changes to lines 1-655

```bash
git diff main -- src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts | grep -E '^[-+]' | head -5
```

output shows:
- only additions (lines with `+` prefix)
- no deletions (no lines with `-` prefix except `---` header)
- all additions are after line 655 (case8)

**why it holds**: git diff proves no deletions or modifications to cases 1-7.

## case8 (new test) verification

### is this a new test or a modified test?

```bash
git show main:src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts | grep -c "case8"
```

output: `0` — case8 does not exist on main.

**why it holds**: case8 is new, not modified. no prior intention to preserve.

## specific assertion check

the guide asks: "did you change expected values to match broken output?"

| test | expected value | source |
|------|----------------|--------|
| case1 | `summary.set = 0` | unchanged from main |
| case1 | `summary.skipped = 1` | unchanged from main |
| case1 | `skipLog.toContain('testorg.all.API_KEY')` | unchanged from main |
| case8 | `summary.set = 2` | new test, covers fix |
| case8 | `slugs.toContain('rhight.prod.USPTO_ODP_API_KEY')` | new test, covers fix |
| case8 | `slugs.toContain('ahbode.prod.DB_PASSWORD')` | new test, covers fix |

**why it holds**: no expected values were changed. case8 assertions are new, not modified.

## the fix relationship

the code fix:
```ts
// fillKeyrackKeys.ts line 258
// before: org: repoManifest.org
// after:  org: asKeyrackKeyOrg({ slug })
```

this fix does not affect cases 1-7 because:
- case1: uses single-org repo (testorg), no extends
- cases 2-7: use single-org repos, no extends

the fix only affects cross-org extends scenarios, which is why case8 was added.

**why extant tests still pass**: the fix is backwards compatible for single-org repos.

## conclusion

| file | tests before | tests after | modifications |
|------|--------------|-------------|---------------|
| asKeyrackKeyOrg.test.ts | 0 | 2 | n/a (new file) |
| fillKeyrackKeys.integration.test.ts | 7 | 8 | 0 (case8 added) |

no test intentions were changed. all modifications are additions.
