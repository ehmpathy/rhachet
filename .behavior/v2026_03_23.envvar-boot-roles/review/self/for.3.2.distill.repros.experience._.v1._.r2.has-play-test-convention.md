# self review: has-play-test-convention

## stone reviewed

3.2.distill.repros.experience._.v1

## review criteria

are journey tests named correctly with `.play.test.ts` suffix?

---

## what I proposed

in the experience reproductions stone, I sketched a test file:

```typescript
given('[case1] repo with default roles [mechanic, driver]', () => {
  // ... test code
});
```

but I did not explicitly name the file.

---

## issue found: file name not specified

### the issue

the test sketch shows code structure but not the file name. the journey tests need `.play.test.ts` suffix.

### how I fixed it

the journey tests for `rhx enroll` should be named:

| test file | purpose |
|-----------|---------|
| `invokeEnroll.play.integration.test.ts` | journey test for enroll command |

this follows the convention:
- `.play.` = journey test (multi-step user experience)
- `.integration.` = requires actual filesystem/cli (not unit)
- `.test.ts` = jest test file

---

## why `.play.integration.test.ts` not `.play.test.ts`

this repo uses integration test runner for CLI tests because:
1. CLI tests invoke actual subprocess
2. CLI tests create temp directories
3. unit test runner doesn't support these

so the convention becomes:
- `invokeEnroll.play.integration.test.ts` for journey tests
- `parseRolesSpec.test.ts` for unit tests

---

## updated test file plan

| component | test file | type |
|-----------|-----------|------|
| parseRolesSpec | `parseRolesSpec.test.ts` | unit |
| computeRoles | `computeRoles.integration.test.ts` | integration |
| genBrainConfigDynamic | `genBrainConfigDynamic.integration.test.ts` | integration |
| invokeEnroll | `invokeEnroll.play.integration.test.ts` | journey |

---

## verdict

✓ issue found: file name was not specified
✓ issue fixed: added explicit file name convention
✓ convention follows `.play.integration.test.ts` pattern for this repo

the experience reproductions document should be updated to include explicit file names.
