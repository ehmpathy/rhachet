# self-review: has-preserved-test-intentions

## test files touched

### new files (no prior intentions to preserve)

| file | status |
|------|--------|
| detectInvocationMethod.test.ts | new — no prior tests |
| execNpmInstallGlobal.test.ts | new — no prior tests |
| getGlobalRhachetVersion.test.ts | new — no prior tests |

### extended files

#### execUpgrade.test.ts

**changes made:**
1. added mocks for new functions (execNpmInstallGlobal, getGlobalRhachetVersion, detectInvocationMethod)
2. added default mock return values in beforeEach
3. added new test cases for --which flag

**prior tests preserved:**
- all 535 lines of prior test code unchanged
- new tests added AFTER line 561
- no assertions modified
- no test cases removed
- no expected values changed

**verified via:**
```
git diff main -- src/domain.operations/upgrade/execUpgrade.test.ts
```

the diff shows only ADDITIONS (green lines). no deletions to prior test logic.

#### upgrade.acceptance.test.ts snapshots

**changes made:**
- snapshot includes `--which <which>` in help output

**this is correct because:**
- the CLI now has a new --which option
- the help text should reflect this addition
- no prior snapshot content was removed or modified

## forbidden actions — none taken

| forbidden action | status |
|------------------|--------|
| weaken assertions | not done |
| remove test cases | not done |
| change expected values to match broken output | not done |
| delete tests that fail | not done |

## conclusion

all prior test intentions preserved. only additions made:
- new test files for new functions
- new test cases for new --which flag
- snapshot updated to reflect new CLI option

no prior tests were modified, weakened, or removed.
