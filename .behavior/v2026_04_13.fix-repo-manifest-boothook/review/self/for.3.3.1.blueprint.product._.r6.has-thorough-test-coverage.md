# self-review: has-thorough-test-coverage (round 6)

## question

does the blueprint declare thorough test coverage for all codepaths?

## methodology

1. review layer coverage — right test type for each layer
2. review case coverage — positive, negative, edge for each codepath
3. review snapshot coverage — exhaustive for contract outputs
4. review test tree — files match conventions

---

## layer coverage review

| codepath | layer declared | test type declared | correct? |
|----------|----------------|-------------------|----------|
| findRolesWithBootableButNoHook | transformer | unit | yes — pure computation, no i/o |
| assertRegistryBootHooks | transformer | unit | yes — error construction is pure |
| invokeRepoIntrospect | orchestrator | integration | see analysis below |
| repo introspect CLI | contract | acceptance | yes — blackbox verification |

### analysis: invokeRepoIntrospect coverage

the blueprint says orchestrator layer needs integration tests. but the test tree shows no separate integration test file for invokeRepoIntrospect.

**is this a gap?**

the change to invokeRepoIntrospect is minimal:
```ts
assertRegistryBootHooks({ registry });  // one line added
```

this is covered by:
1. unit tests verify assertRegistryBootHooks logic
2. acceptance tests verify the CLI contract (exit code, stderr)

the composition (call in right place) is tested via acceptance tests. separate integration tests would be redundant for a one-line orchestrator change.

**verdict:** holds — coverage is appropriate for scope of change

---

## case coverage review

### findRolesWithBootableButNoHook

| case | type | coverage assessment |
|------|------|---------------------|
| case1 | positive | all valid → empty array |
| case2 | negative | briefs.dirs, no hook → violation |
| case3 | negative | skills.dirs, no hook → violation |
| case4 | negative | both dirs, no hook → violation |
| case5 | positive | typed skills only → empty |
| case6 | positive | inits only → empty |
| case7 | edge | empty onBoot array → violation |
| case8 | edge | undefined hooks → violation |
| case9 | edge | empty briefs.dirs array → violation |
| case10 | edge | multiple invalid → all returned |

**gap found:** no explicit test for empty registry (zero roles).

criteria usecase.7 says: "given(empty registry with no roles) then(introspect succeeds)"

the logic would return empty violations for empty registry, but this should be explicit.

**fix:** add case to findRolesWithBootableButNoHook coverage table

### assertRegistryBootHooks

| case | type | coverage assessment |
|------|------|---------------------|
| case1 | positive | all valid → no throw |
| case2 | negative | one invalid → throws BadRequestError |
| case3 | negative | error contains role slug |
| case4 | negative | error contains hint |
| case5 | edge | multiple invalid → error lists all |

**gap found:** no explicit test for empty registry (zero roles).

same criteria usecase.7 applies here.

**fix:** add case to assertRegistryBootHooks coverage table

### repo introspect CLI (acceptance)

| case | type | coverage assessment |
|------|------|---------------------|
| case1 | positive | valid registry → success |
| case2 | negative | no hook → exit != 0 |
| case3 | negative | stderr contains slug |
| case4 | negative | stderr contains hint |
| case5 | positive | typed-skills-only → success |

coverage looks thorough for the CLI contract.

---

## snapshot coverage review

blueprint declares:
- success stdout format (extant)
- failure stderr format (new)

**is this exhaustive?**

acceptance test cases:
- case1: success → stdout snapshot needed
- case2-4: failure → stderr snapshot needed
- case5: success → stdout snapshot needed (may share with case1)

the blueprint says "failure stderr format (new)" which covers case2-4.

**gap check:** does case3/case4 use snapshot for stderr?

look closer: case3 and case4 are "stderr contains X" assertions. these could be:
- explicit string assertions (`expect(stderr).toContain('...')`)
- or snapshot assertions

the blueprint says "failure stderr format (new) — turtle vibes treestruct error" which implies one snapshot for the failure case. but case3/case4 are separate assertions about content.

this is actually fine because:
- snapshot captures full output format
- case3/case4 assertions verify specific content exists

**verdict:** holds — snapshot captures format, assertions verify content

---

## test tree review

```
src/domain.operations/manifest/
├── findRolesWithBootableButNoHook.ts
├── [+] findRolesWithBootableButNoHook.test.ts         # unit: transformer
├── assertRegistryBootHooks.ts
└── [+] assertRegistryBootHooks.test.ts                # unit: transformer

blackbox/
├── .test/assets/
│   └── [+] with-roles-package-no-hook/                # fixture
└── cli/
    └── [~] repo.introspect.acceptance.test.ts         # acceptance
```

**file name convention:** follows convention (.test.ts for unit, .acceptance.test.ts for acceptance)
**locations:** correct (domain.operations for unit, blackbox/cli for acceptance)
**fixture:** included for negative acceptance case

**verdict:** holds

---

## gaps found and fixes

### gap 1: empty registry case not explicit

**problem:** criteria usecase.7 requires empty registry test, but blueprint doesn't list it.

**fix applied to blueprint:**

add to findRolesWithBootableButNoHook:
```
| [case11] | edge | empty registry (zero roles) → returns empty array |
```

add to assertRegistryBootHooks:
```
| [case6] | edge | empty registry → no throw |
```

---

## updated blueprint sections

### findRolesWithBootableButNoHook (with fix)

| case | type | description |
|------|------|-------------|
| [case1] | positive | all roles valid → returns empty array |
| [case2] | negative | role with briefs.dirs, no onBoot → returns violation |
| [case3] | negative | role with skills.dirs, no onBoot → returns violation |
| [case4] | negative | role with both dirs, no onBoot → returns violation |
| [case5] | positive | role with typed skills only (no dirs) → returns empty |
| [case6] | positive | role with inits.exec only (no dirs) → returns empty |
| [case7] | edge | empty onBoot array → returns violation |
| [case8] | edge | undefined hooks → returns violation |
| [case9] | edge | empty briefs.dirs array [] → returns violation |
| [case10] | edge | multiple roles, some invalid → returns all invalid |
| [case11] | edge | empty registry (zero roles) → returns empty array |

### assertRegistryBootHooks (with fix)

| case | type | description |
|------|------|-------------|
| [case1] | positive | all roles valid → no throw |
| [case2] | negative | role with no onBoot → throws BadRequestError |
| [case3] | negative | error message contains role slug |
| [case4] | negative | error message contains hint |
| [case5] | edge | multiple invalid → error lists all |
| [case6] | edge | empty registry → no throw |

---

## conclusion

| coverage area | status | notes |
|---------------|--------|-------|
| layer coverage | holds | appropriate test types for each layer |
| case coverage | fixed | add empty registry cases |
| snapshot coverage | holds | format via snapshot, content via assertions |
| test tree | holds | files follow conventions |

one gap found: empty registry case not explicit.
fix applied: add case11 and case6 to respective coverage tables.

**verdict:** **pass** — after the empty registry test cases are added

