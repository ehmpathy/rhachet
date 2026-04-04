# self-review: has-preserved-test-intentions (r3)

## tests touched

| file | change type | prior tests affected |
|------|-------------|---------------------|
| asKeyrackKeyOrg.test.ts | NEW file | none (no prior tests) |
| fillKeyrackKeys.integration.test.ts | ADDED case8 | none (cases 1-7 unchanged) |

## git diff analysis

```bash
git diff main -- src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts
```

the diff shows:
- line 655: end of case7 (unchanged)
- lines 656-745: **addition only** — new case8 block
- no deletions
- no modifications to extant test code

**why it holds**: the diff is purely additive. no extant test assertions were modified.

## case-by-case verification

### asKeyrackKeyOrg.test.ts

- **status**: NEW file
- **prior tests**: none
- **intention preserved?**: n/a — no prior intention to preserve

**why it holds**: cannot break intention of a test that did not exist.

### fillKeyrackKeys.integration.test.ts

#### cases 1-7: unchanged

```
[case1] repo with env=all key already set — NOT TOUCHED
[case2] fresh fill with 2+ keys (journey 1) — NOT TOUCHED
[case3] multiple owners (journey 2) — NOT TOUCHED
[case4] refresh forces re-set of extant key — NOT TOUCHED
[case5] --key filter with nonexistent key — NOT TOUCHED
[case6] nonexistent owner (prikey fail-fast) — NOT TOUCHED
[case7] refresh + multiple owners — NOT TOUCHED
```

**why it holds**: git diff shows no changes to lines 1-655, where cases 1-7 live.

#### case8: new test

```
[case8] cross-org extends (root=ahbode, extended=rhight) — NEW
```

**why it holds**: new test case, no prior intention to preserve.

## forbidden actions checklist

| forbidden action | did this PR do it? |
|------------------|-------------------|
| weaken assertions to make tests pass | no — no assertions changed |
| remove test cases that "no longer apply" | no — only additions |
| change expected values to match broken output | no — no expected values changed |
| delete tests that fail instead of fix code | no — no deletions |

**why it holds**: the PR is purely additive. no test logic was modified.

## the fix vs the test

the fix was in `fillKeyrackKeys.ts` line 258:
```ts
// before
org: repoManifest.org

// after
org: asKeyrackKeyOrg({ slug })
```

the test was added to verify the fix works — it does not modify any prior test's intention.

## conclusion

| check | result |
|-------|--------|
| extant test assertions preserved? | yes — unchanged |
| test cases removed? | no |
| expected values changed? | no |
| tests deleted? | no |

all test intentions preserved. changes are purely additive.
