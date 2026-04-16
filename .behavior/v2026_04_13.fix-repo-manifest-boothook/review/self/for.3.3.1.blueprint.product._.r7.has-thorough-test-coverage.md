# self-review: has-thorough-test-coverage (round 7)

## question

does the blueprint declare thorough test coverage for all codepaths?

## context

r6 found one gap: empty registry case was not explicit. that gap has been fixed via case11 and case6 in the blueprint.

this round verifies the fix and confirms all coverage areas hold.

---

## layer coverage verification

### findRolesWithBootableButNoHook

| question | answer |
|----------|--------|
| what layer? | transformer — pure computation |
| what test type declared? | unit |
| is this correct? | yes — no i/o, deterministic |
| are there integration concerns? | no — takes registry object, returns array |

**why this holds:** the function iterates over `registry.roles`, checks properties, returns violations. all pure computation. unit tests are appropriate.

### assertRegistryBootHooks

| question | answer |
|----------|--------|
| what layer? | transformer — error construction |
| what test type declared? | unit |
| is this correct? | yes — builds message string, throws |
| are there integration concerns? | no — calls find function, constructs error |

**why this holds:** the function calls findRolesWithBootableButNoHook, checks result, builds error message, throws. the find function is unit tested separately. assertRegistryBootHooks just constructs an error — pure computation.

### invokeRepoIntrospect

| question | answer |
|----------|--------|
| what layer? | orchestrator — composition |
| what test type declared? | integration |
| is this correct? | yes, but see analysis |
| are there separate integration tests? | no — acceptance tests cover it |

**why this holds:** the change is one line: `assertRegistryBootHooks({ registry })`. the called function is unit tested. the composition is verified via acceptance tests. separate integration tests would be redundant for a one-line change.

### repo introspect CLI

| question | answer |
|----------|--------|
| what layer? | contract — cli entry point |
| what test type declared? | acceptance |
| is this correct? | yes — blackbox verification |
| are there integration tests? | acceptance tests serve as integration tests for cli |

**why this holds:** the guide says contracts need integration + acceptance. for cli, acceptance tests ARE the integration tests — they invoke the cli as a subprocess and verify stdout/stderr/exit code.

---

## case coverage verification

### findRolesWithBootableButNoHook — 11 cases

| case | type | description | maps to criteria |
|------|------|-------------|------------------|
| case1 | positive | all valid → empty | usecase.1 (valid registry) |
| case2 | negative | briefs.dirs, no hook → violation | usecase.2 (briefs.dirs) |
| case3 | negative | skills.dirs, no hook → violation | usecase.2 variant |
| case4 | negative | both dirs, no hook → violation | usecase.2 variant |
| case5 | positive | typed skills only → empty | usecase.3 |
| case6 | positive | inits only → empty | usecase.6 |
| case7 | edge | empty onBoot array → violation | boundary (empty array) |
| case8 | edge | undefined hooks → violation | boundary (undefined) |
| case9 | edge | empty briefs.dirs array → violation | boundary (property presence) |
| case10 | edge | multiple invalid → all returned | usecase.5 |
| case11 | edge | empty registry → empty | usecase.7 |

**positive cases:** 4 (case1, case5, case6, case11)
**negative cases:** 4 (case2, case3, case4, case10)
**edge cases:** 3 (case7, case8, case9)

**why this holds:** every criteria usecase has a test case. boundary conditions are covered. positive, negative, and edge all present.

### assertRegistryBootHooks — 6 cases

| case | type | description | maps to criteria |
|------|------|-------------|------------------|
| case1 | positive | all valid → no throw | usecase.1 (introspect succeeds) |
| case2 | negative | no hook → throws | usecase.2 (exit != 0) |
| case3 | negative | error contains slug | error format requirement |
| case4 | negative | error contains hint | error format (teach the pattern) |
| case5 | edge | multiple invalid → lists all | usecase.5 |
| case6 | edge | empty registry → no throw | usecase.7 |

**positive cases:** 1 (case1)
**negative cases:** 3 (case2, case3, case4)
**edge cases:** 2 (case5, case6)

**why this holds:** the function has simple logic (call find, check, throw or return). error message content tests (case3, case4) verify the "guard teaches the pattern" requirement from vision.

### repo introspect CLI — 5 cases

| case | type | description | maps to criteria |
|------|------|-------------|------------------|
| case1 | positive | valid → success | usecase.1 |
| case2 | negative | no hook → exit != 0 | usecase.2 |
| case3 | negative | stderr contains slug | error format |
| case4 | negative | stderr contains hint | error format |
| case5 | positive | typed-skills-only → success | usecase.3 |

**positive cases:** 2 (case1, case5)
**negative cases:** 3 (case2, case3, case4)
**edge cases:** 0 in acceptance (covered at unit level)

**why this holds:** acceptance tests verify the contract (exit code, stdout/stderr). edge cases are covered at the unit test level. acceptance tests focus on blackbox behavior.

---

## snapshot coverage verification

blueprint declares:
```
acceptance tests will snapshot:
- success stdout format (extant coverage)
- failure stderr format (new) — turtle vibes treestruct error
```

### verification

| scenario | snapshot declared? |
|----------|-------------------|
| success stdout | yes (extant) |
| failure stderr | yes (new) |

### are all error paths covered?

the blueprint has one error path: roles with bootable content but no hook. this produces one error message format (the treestruct). the snapshot covers this.

### why this holds

the error message is deterministic given violations. one snapshot captures the format. case3/case4 add explicit assertions for content within that format.

---

## test tree verification

```
src/domain.operations/manifest/
├── findRolesWithBootableButNoHook.ts
├── [+] findRolesWithBootableButNoHook.test.ts         # unit
├── assertRegistryBootHooks.ts
└── [+] assertRegistryBootHooks.test.ts                # unit

blackbox/
├── .test/assets/
│   └── [+] with-roles-package-no-hook/                # fixture
└── cli/
    └── [~] repo.introspect.acceptance.test.ts         # acceptance
```

| file | type | location | convention |
|------|------|----------|------------|
| findRolesWithBootableButNoHook.test.ts | unit | src/domain.operations | collocated |
| assertRegistryBootHooks.test.ts | unit | src/domain.operations | collocated |
| repo.introspect.acceptance.test.ts | acceptance | blackbox/cli | separate |

**why this holds:** unit tests collocated with implementation, acceptance tests in blackbox directory. fixture included for negative case.

---

## r6 fix verification

### gap fixed: empty registry case

r6 identified that criteria usecase.7 (empty registry) was not explicitly tested.

**verification:** blueprint now includes:
- case11 for findRolesWithBootableButNoHook: "empty registry (zero roles) → returns empty array"
- case6 for assertRegistryBootHooks: "empty registry → no throw"

**why fix is complete:** both functions now explicitly test the empty registry scenario. the criteria usecase.7 is covered.

---

## conclusion

| coverage area | status | evidence |
|---------------|--------|----------|
| layer coverage | holds | each layer has appropriate test type |
| case coverage | holds | 22 total cases (11 + 6 + 5), all types present |
| snapshot coverage | holds | success + failure paths declared |
| test tree | holds | files follow conventions, fixture included |
| r6 fix | verified | case11 and case6 address empty registry |

all coverage requirements are met. the r6 gap has been fixed.

**verdict:** **pass** — test coverage is thorough and complete

