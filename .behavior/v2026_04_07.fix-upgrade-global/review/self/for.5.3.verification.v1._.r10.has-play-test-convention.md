# self-review: has-play-test-convention (r10)

## the question

> are journey test files named correctly with `.play.test.ts` suffix?

## verification: search for play tests

```bash
$ find . -name "*.play.test.ts"
# (no results)

$ find . -name "*.play.*.test.ts"
# (no results)
```

no play tests exist in this behavior.

## why no play tests: this is a feature, not a bug fix

| behavior type | play tests needed? | reason |
|---------------|-------------------|--------|
| bug fix | yes | replay the user journey that exposed the bug |
| feature request | no | no prior journey to replay |

this behavior (`fix-upgrade-global`) is mislabeled as "fix" but is actually a feature request:

**the wish:**
> rhx upgrade should also upgrade global rhachet by default, if installed globally

this is additive functionality, not a bug reproduction. there is no user journey to replay because the functionality did not exist before.

## test coverage for this behavior

| file | type | purpose |
|------|------|---------|
| `detectInvocationMethod.test.ts` | unit | verify npx vs global detection |
| `execNpmInstallGlobal.test.ts` | unit | verify global npm install works |
| `getGlobalRhachetVersion.test.ts` | unit | verify version detection |
| `execUpgrade.test.ts` | unit | verify --which flag logic and defaults |
| `upgrade.acceptance.test.ts` | acceptance | verify CLI --help output snapshot |

## when play tests would be required

play tests are required when:
1. a bug is fixed and the fix must be validated against the original journey
2. a complex multi-step workflow needs end-to-end validation
3. repros artifact exists with steps to reproduce

none of these apply:
- no bug to fix (new feature)
- no complex multi-step workflow (single command with flag)
- no repros artifact in `.behavior/v2026_04_07.fix-upgrade-global/`

## convention check: no files to validate

since no play tests exist, the convention check passes trivially:
- no `.play.test.ts` files to name incorrectly
- no play tests in wrong location
- no fallback convention needed

## conclusion

play test convention check passes:
- no play tests exist (correct for a feature request)
- no files to name incorrectly
- test coverage provided by unit + acceptance tests
