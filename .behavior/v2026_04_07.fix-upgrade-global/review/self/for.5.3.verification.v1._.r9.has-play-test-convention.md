# self-review: has-play-test-convention (r9)

## the question

> are journey test files named correctly with `.play.test.ts` suffix?

## context: no journey tests for this behavior

this behavior is a feature request, not a bug fix. it has:

| test type | location | purpose |
|-----------|----------|---------|
| unit tests | `execUpgrade.test.ts` | test --which flag logic |
| unit tests | `detectInvocationMethod.test.ts` | test npx vs global detection |
| unit tests | `execNpmInstallGlobal.test.ts` | test global install |
| unit tests | `getGlobalRhachetVersion.test.ts` | test version detection |
| acceptance tests | `upgrade.acceptance.test.ts` | test CLI --help snapshot |

## journey test check

```bash
$ find . -name "*.play.test.ts"
# (no results)
```

no journey tests exist for this behavior because:

1. **no user journey to replay** — this is a new feature, not a regression fix
2. **no repros artifact** — the behavior dir has no repros to reproduce
3. **unit + acceptance cover the paths** — the critical paths are tested via unit and acceptance tests

## when would a journey test be needed?

journey tests (`.play.test.ts`) are for:
- bug fixes where the user journey must be replayed
- complex workflows with multiple steps
- scenarios that require end-to-end validation

this behavior adds a flag and default. the tests verify:
- flag values work (`--which local|global|both`)
- defaults work (npx → local, rhx → both)
- output format matches CLI contract

these are covered by unit tests and acceptance tests. no journey replay is needed.

## conclusion

no journey tests needed — feature request with unit + acceptance coverage. convention check passes (no `.play.test.ts` files to name incorrectly).
