# review.self: role-standards-coverage (round 7)

## question: are all relevant mechanic standards applied?

### enumerate rule directories checked

| directory | relevant? | expected patterns |
|-----------|-----------|-------------------|
| code.test/frames.behavior | yes | given-when-then, useBeforeAll |
| code.test/scope.coverage | yes | unit tests for transformer, integration for orchestrator |
| code.prod/pitofsuccess.errors | yes | failfast, failloud |
| code.prod/readable.comments | yes | what-why headers |

### check: unit test coverage

**findRolesWithBootableButNoHook.test.ts:**
- 13 test cases (case1-case13)
- covers all three violation reasons:
  - no-hook-declared: case2, case3, case4, case5
  - absent-roles-boot-command: case8
  - wrong-role-name: case9
- covers edge cases:
  - valid hook: case1
  - empty registry: case7
  - multiple violations: case6, case13
  - valid variations: case10, case11, case12

**assertRegistryBootHooksDeclared.test.ts:**
- 9 test cases (case1-case9)
- covers all violation types: case2, case3, case4
- covers error message content: case5, case6, case7
- covers multiple violations: case8
- covers edge cases: case1 (valid), case9 (empty)

**why it holds:** both files have comprehensive unit tests via given-when-then pattern from test-fns.

### check: acceptance test coverage

**repo.introspect.acceptance.test.ts case9:**
- tests the blackbox behavior
- asserts exit code, stderr content, role slug, reason, hint

**why it holds:** acceptance test validates the contract as users experience it.

### check: error classes

**assertRegistryBootHooksDeclared.ts:**
- uses `BadRequestError` from helpful-errors
- error is user-fixable (hook config is absent)
- error includes violations metadata

**why it holds:** matches failloud pattern — error has context and hints.

### check: test file structure

| prod file | test file | status |
|-----------|-----------|--------|
| findRolesWithBootableButNoHook.ts | findRolesWithBootableButNoHook.test.ts | exists ✓ |
| assertRegistryBootHooksDeclared.ts | assertRegistryBootHooksDeclared.test.ts | exists ✓ |

**why it holds:** collocated .test.ts files per convention.

### absent patterns check

| pattern | expected? | present? |
|---------|-----------|----------|
| unit tests | yes | yes — 22 tests total |
| acceptance test | yes | yes — case9 |
| integration test | no — transformer is pure | n/a |
| snapshot test | no — not user-visible output | n/a |

**why no integration test:** `findRolesWithBootableButNoHook` is a pure transformer with no i/o. unit tests are sufficient.

**why no snapshot:** output is stderr, tested via `toContain` assertions in acceptance test. snapshot would be redundant.

### conclusion

all mechanic standards are covered:
- unit tests for both new files
- acceptance test for blackbox behavior
- given-when-then structure throughout
- no absent patterns for this grain (transformer + orchestrator)

