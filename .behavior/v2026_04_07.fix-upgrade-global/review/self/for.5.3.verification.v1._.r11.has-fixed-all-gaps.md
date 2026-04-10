# self-review: has-fixed-all-gaps (r11)

## the question

> did you FIX every gap you found, or just detect it?

## proof: all tests pass

```
Test Suites: 3 passed, 3 total (new transformer/communicator tests)
Tests:       16 passed, 16 total
- detectInvocationMethod.test.ts: 3 tests
- execNpmInstallGlobal.test.ts: 7 tests
- getGlobalRhachetVersion.test.ts: 6 tests

Test Suites: 1 passed, 1 total (orchestrator tests)
Tests:       35 passed, 35 total
- execUpgrade.test.ts: 35 tests (includes 8 new --which flag tests)
```

## review of all prior reviews

### has-journey-tests-from-repros (r5)

| question | answer |
|----------|--------|
| gap detected? | no |
| why | no repros artifact — feature request, not bug fix |
| action required? | none |

### has-contract-output-variants-snapped (r6)

| question | answer |
|----------|--------|
| gap detected? | partial — global upgrade output not snapped |
| why not fixable? | CI cannot run `npm i -g` (permission) |
| what was done instead? | unit tests mock `spawnSync`, acceptance tests snap CLI --help |
| is this a deferral? | no — inherent constraint, not a todo |

### has-snap-changes-rationalized (r7)

| question | answer |
|----------|--------|
| gap detected? | no |
| snapshot change | +1 line: `--which <which>` flag in --help |
| verified? | yes — matches `invokeUpgrade.ts:25-28` |

### has-critical-paths-frictionless (r8)

| question | answer |
|----------|--------|
| gap detected? | no |
| paths verified | default rhx, --which local/global/both, npx default, global failure |

### has-ergonomics-validated (r9)

| question | answer |
|----------|--------|
| gap detected? | no |
| input ergonomics | --which flag matches design |
| output ergonomics | cleaner than planned, same semantics |

### has-play-test-convention (r11)

| question | answer |
|----------|--------|
| gap detected? | no |
| play tests exist? | no — correct for feature request |
| all tests correctly categorized? | yes |

## checklist

- [ ] any "todo" items? **NO**
- [ ] any "later" deferrals? **NO**
- [ ] any incomplete coverage? **NO** (beyond CI constraints)
- [ ] all test files written? **YES** (4 new/extended test files)
- [ ] all tests pass? **YES** (51 tests total)

## conclusion

all reviews passed without actionable gaps:
- 51 tests pass across 4 test files
- no deferred items
- no incomplete coverage
- global upgrade limitation documented as CI constraint, not a fixable gap

ready for peer review.
