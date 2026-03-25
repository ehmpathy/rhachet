# self-review r8: has-critical-paths-frictionless

## deeper pass: verified critical paths via actual test execution

r7 documented critical paths from criteria.blackbox. this pass verified them via actual acceptance test execution.

---

## test execution results

### os.daemon acceptance tests

```
npm run test:acceptance -- blackbox/cli/keyrack.vault.osDaemon.acceptance.test.ts

Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
Snapshots:   4 passed, 4 total
```

all 20 tests passed. critical path verified:
- [case1][t0]: set stores to daemon → mech=EPHEMERAL_VIA_SESSION
- [case1][t1]: get returns secret from daemon → status=granted
- [case3][t0]: relock clears key → status=absent
- [case4][t0]: unlock after relock → status=lost

### 1password acceptance tests

```
npm run test:acceptance -- blackbox/cli/keyrack.vault.1password.acceptance.test.ts

Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
Snapshots:   3 passed, 3 total
```

all 21 tests passed. critical path verified:
- [case1][t0]: invalid exid → exits non-zero
- [case1][t1]: valid op://uri → accepted
- [case2][t0-t1]: list shows entry with mech=REFERENCE
- [case3][t0]: get without unlock → status=locked
- [case6][t0-t2]: op cli not installed → exit 2 with instructions

---

## frictionless verification

### os.daemon path

| step | result | friction? |
|------|--------|-----------|
| set --vault os.daemon | prompts once, stores to daemon | no |
| get after set | returns secret immediately | no |
| relock then get | absent with fix hint | no |
| relock then unlock | lost with re-set hint | no |

**verdict:** frictionless.

### 1password path

| step | result | friction? |
|------|--------|-----------|
| set with invalid exid | fails fast with error | no |
| set with valid exid | accepted | no |
| list shows entry | mech=REFERENCE visible | no |
| get without unlock | locked with fix hint | no |
| op cli absent | exit 2 with install instructions | no |

**verdict:** frictionless.

---

## edge cases verified

| edge case | test | result |
|-----------|------|--------|
| daemon restart clears keys | [case3][t0] | absent with fix hint |
| unlock reports lost for cleared keys | [case4][t0] | lost status with hint |
| 1password keys require unlock | [case3][t0] | locked status with fix |
| del removes pointer only | [case4][t0] | key no longer in list |

all edge cases have clear status messages and actionable hints.

---

## conclusion

verified via actual test execution:
- 20/20 os.daemon tests passed
- 21/21 1password tests passed
- all critical paths are frictionless
- all edge cases have helpful guidance

holds.
