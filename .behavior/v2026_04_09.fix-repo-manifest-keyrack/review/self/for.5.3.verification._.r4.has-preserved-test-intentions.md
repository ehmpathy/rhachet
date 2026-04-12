# self-review: has-preserved-test-intentions (r4)

## approach

enumerated every test file in the PR. verified each is new (not modified). examined the sole modified source file.

## detailed file analysis

### test files — all new

| file path | git status | line count | why new |
|-----------|------------|------------|---------|
| src/contract/cli/invokeRepoCompile.integration.test.ts | ?? | 649 | compile feature did not extant before |
| src/domain.operations/compile/getAllArtifactsForRole.integration.test.ts | ?? | 443 | new domain operation |
| src/infra/filesystem/getAllFilesByGlobs.integration.test.ts | ?? | 343 | new infra layer function |

**`??` in git status = untracked file = new file.**

these test files cannot have prior intentions because:
1. the compile feature is net-new
2. the files did not extant before this PR
3. there was no prior code to test

### source files — one modification

| file path | git status | change |
|-----------|------------|--------|
| src/contract/cli/invoke.ts | M | added: `invokeRepoCompile({ program });` |

the modification is a single line that registers the new command. it does not change any extant behavior.

### production code — all new

| file path | git status |
|-----------|------------|
| src/contract/cli/invokeRepoCompile.ts | ?? |
| src/domain.operations/compile/getAllArtifactsForRole.ts | ?? |
| src/infra/filesystem/getAllFilesByGlobs.ts | ?? |

all production code is new. no extant code was modified (except the command registration line).

## intention preservation checklist

the guide asks:

| question | answer |
|----------|--------|
| what did this test verify before? | N/A — tests are new |
| does it still verify the same behavior after? | N/A — no prior version |
| did you change what the test asserts? | N/A — no prior assertions |
| did you fix why it failed? | N/A — no prior failures |

### forbidden patterns — none detected

| forbidden pattern | detected |
|-------------------|----------|
| weaken assertions to make tests pass | no — all assertions are new |
| remove test cases that "no longer apply" | no — all cases are new |
| change expected values to match broken output | no — all expected values are new |
| delete tests that fail instead of fix code | no — no deletions |

## why this holds

this PR is purely additive:
- new command: `repo compile`
- new domain operation: `getAllArtifactsForRole`
- new infra function: `getAllFilesByGlobs`
- new tests for each

no extant tests were touched. no extant production code was modified (except one registration line). therefore, no test intentions could have been compromised.

## conclusion

test intentions are preserved because there were no prior test intentions to preserve. all tests in this PR are new, written to verify new functionality.

