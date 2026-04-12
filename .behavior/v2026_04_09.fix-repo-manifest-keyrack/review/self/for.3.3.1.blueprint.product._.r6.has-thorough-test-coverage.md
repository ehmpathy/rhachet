# self-review r6: has-thorough-test-coverage

## layer coverage verification

### transformers

| codepath | layer | test type | matches rule? |
|----------|-------|-----------|---------------|
| applyArtifactGlobs | transformer | unit | yes |
| applyExclusions | transformer | unit | yes |

**verdict**: transformers have unit tests as required.

### orchestrators

| codepath | layer | test type | matches rule? |
|----------|-------|-----------|---------------|
| getAllArtifactsForRole | orchestrator | integration | yes |
| copyFileWithStructure | orchestrator | integration | yes |
| pruneEmptyDirs | orchestrator | integration | yes |

**verdict**: orchestrators have integration tests as required.

### contracts

| codepath | layer | test type | matches rule? |
|----------|-------|-----------|---------------|
| invokeRepoCompile | contract | integration + acceptance | yes |

**verdict**: contract has both integration AND acceptance tests as required.

## case coverage verification

### unit tests (transformers)

| codepath | positive | negative | edge | declared? |
|----------|----------|----------|------|-----------|
| applyArtifactGlobs | yes | yes | yes | `# unit: positive/negative/edge` |
| applyExclusions | yes | yes | yes | `# unit: positive/negative/edge` |

**verdict**: unit tests declare all case types.

### integration tests (orchestrators)

| codepath | declared cases |
|----------|----------------|
| getAllArtifactsForRole | not specified |
| copyFileWithStructure | not specified |
| pruneEmptyDirs | not specified |

**found issue**: integration tests do not declare case coverage types.

**fix needed**: add case coverage notation to integration test comments.

### acceptance tests (contract)

| case | type | snapshot |
|------|------|----------|
| happy path: all artifacts copied | positive | yes |
| default exclusions applied | positive | yes |
| custom --include overrides | positive | yes |
| custom --exclude applied | positive | yes |
| error: absent --from | negative | yes |
| error: absent --into | negative | yes |
| error: --into outside repo | negative | yes |
| error: no package.json | negative | yes |
| error: no .agent/ | negative | yes |
| error: no roles | negative | yes |
| error: role dir absent | negative | yes |
| empty dirs pruned | edge | yes |
| dist/ preserved | edge | yes |

**count**:
- positive: 4
- negative: 7
- edge: 2

**verdict**: acceptance tests have exhaustive case coverage.

## snapshot coverage verification

the acceptance test cases table shows `snapshot: yes` for all 13 cases.

**verify against error output examples in blueprint**:
- `absent --from` — has example output
- `--into outside repo` — has example output
- `role dir absent` — has example output

**found issue**: not all negative cases have example outputs in blueprint.

these negative cases lack example outputs:
- `absent --into`
- `no package.json`
- `no .agent/`
- `no roles`

**fix needed**: add example outputs for all negative cases.

## fixes to apply

### fix 1: add case coverage notation to integration tests

update test tree comments:
```
├─ [+] getAllArtifactsForRole.integration.test.ts  # integration: positive/negative/edge
├─ [+] copyFileWithStructure.integration.test.ts   # integration: positive/negative
├─ [+] pruneEmptyDirs.integration.test.ts          # integration: positive/edge
```

### fix 2: add example outputs for all negative cases

add to blueprint:
- `absent --into`
- `no package.json`
- `no .agent/`
- `no roles`

## conclusion

two issues found:
1. integration tests lack case coverage notation
2. some negative cases lack example outputs

will apply fixes to blueprint.
