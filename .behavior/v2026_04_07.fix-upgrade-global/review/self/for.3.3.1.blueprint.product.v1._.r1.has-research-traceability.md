# self-review: has-research-traceability

## reflection

i traced each research recommendation through the blueprint to verify that:
1. every [REUSE] pattern is preserved unchanged
2. every [EXTEND] pattern has corresponding blueprint changes
3. every [NEW] pattern has a new file in the filediff tree
4. any omissions have documented rationale

## production research traceability

### pattern 1: CLI command registration [EXTEND]

**research says:** add `--which` option to command registration in invokeUpgrade.ts

**blueprint says:** invokeUpgrade.ts [EXTEND] with `.option('--which <which>', ...)`

**why it holds:** the blueprint explicitly shows the commander.js option syntax matching how extant options are registered. the research identified the exact location and pattern; the blueprint applies it.

### pattern 2: upgrade execution logic [EXTEND]

**research says:** add `which` parameter to execUpgrade input, add global upgrade logic

**blueprint says:** execUpgrade.ts [EXTEND] with `which?: 'local' | 'global' | 'both'` in input

**why it holds:** the codepath tree shows `execUpgrade({ which, ... })` and branches for `if which includes 'local'` and `if which includes 'global'`. this directly traces to the research recommendation.

### pattern 3: npm install execution [REUSE]

**research says:** reuse extant execNpmInstall for local; create new function for global

**blueprint says:** execNpmInstall.ts unchanged; execNpmInstallGlobal.ts [NEW]

**why it holds:** the codepath tree shows `execNpmInstall (extant)` under local branch, and `execNpmInstallGlobal (new)` under global branch. local logic untouched.

### pattern 4: package manager detection [REUSE]

**research says:** no change needed; global installs are npm-only per vision

**blueprint says:** notes section confirms "global install always uses npm (never pnpm)"

**why it holds:** the blueprint respects that pnpm global is rare. the new execNpmInstallGlobal hardcodes npm, while local continues to use detectPackageManager.

### pattern 5: upgrade result structure [EXTEND]

**research says:** add `upgradedGlobal: boolean | 'skipped' | 'failed'` to result

**blueprint says:** `upgradedGlobal: { upgraded: boolean; hint: string | null } | null`

**why it holds:** the blueprint uses a richer shape than research suggested. instead of a discriminated union, it uses a nullable object with hint. this is better — the hint enables actionable output. the research intent is satisfied with improved ergonomics.

### pattern 6: output format (treestruct) [REUSE]

**research says:** apply same treestruct pattern for global upgrade output

**blueprint says:** output format section shows `📦 upgrade (npm -g)` with treestruct

**why it holds:** the output examples show the exact treestruct pattern with `├──` and `└──` prefixes, matching extant output format.

### pattern 7: CLI output summary [EXTEND]

**research says:** add global upgrade summary: `✨ rhachet upgraded (global)`

**blueprint says:** output format shows `✨ rhachet upgraded (global)` in summary

**why it holds:** the output examples show the exact line the research recommended. additionally, the failure case shows `⚠️ global upgrade failed (permission denied)` with hint.

### pattern A: npx vs global detection [NEW]

**research says:** create `detectInvocationMethod.ts` using npm_execpath env var

**blueprint says:** detectInvocationMethod.ts [NEW] with `npm_execpath` check

**why it holds:** the blueprint includes the exact implementation snippet from the approach option the research identified. tests cover both npx and global cases.

### pattern B: global npm install [NEW]

**research says:** create `execNpmInstallGlobal.ts` with EACCES handling

**blueprint says:** execNpmInstallGlobal.ts [NEW] with EACCES → hint pattern

**why it holds:** the blueprint includes implementation showing spawnSync with -g flag, EACCES check in stderr, and structured result with hint.

### pattern C: global version detection [NEW] — ORIGINALLY OMITTED, NOW FIXED

**research says:** create `getGlobalRhachetVersion.ts` for "already current" check

**original blueprint:** not included in filediff tree

**fixed blueprint:** added getGlobalRhachetVersion.ts with implementation and tests

**why it now holds:** the has-zero-deferrals review identified this as a vision requirement (criteria usecase.4: "no unnecessary network calls"). the blueprint was updated to include this file.

### resolution: pattern C (getGlobalRhachetVersion.ts) — NO LONGER OMITTED

**research recommendation:** create `getGlobalRhachetVersion.ts` for "already current" check.

**original omission rationale:** deferred to future work because MVP can rely on npm's built-in behavior.

**why this was wrong:** the has-zero-deferrals review identified that criteria usecase.4 requires "no unnecessary network calls" with "sothat(upgrade is fast when already up to date)". relying on npm's @latest check still makes a network call to the registry — this violates the vision requirement.

**fix applied:** added getGlobalRhachetVersion.ts to the blueprint:
- added to filediff tree
- added implementation using `npm list -g rhachet --depth=0 --json`
- added to codepath tree (check version before install)
- added to test coverage table

the blueprint now satisfies the "no unnecessary network calls" requirement.

## test research traceability

### pattern 1: given/when/then structure [REUSE]

**research says:** use test-fns BDD pattern for all tests

**why it holds:** implicit in all test files. the blueprint doesn't show test code, but the test coverage table lists unit/integration tests which will follow extant patterns. no change needed to the pattern itself.

### pattern 2: dependency mock setup [EXTEND]

**research says:** add mocks for detectInvocationMethod and execNpmInstallGlobal

**blueprint says:** execUpgrade.test.ts changes include "add mock for detectInvocationMethod" and "add mock for execNpmInstallGlobal"

**why it holds:** explicitly listed in the extended files section.

### pattern 3: typed mock references [REUSE]

**research says:** use `jest.MockedFunction<typeof X>` pattern

**why it holds:** implicit. the blueprint doesn't detail mock typing, but the extant pattern will be followed. this is test implementation detail, not architecture.

### pattern 4: mock reset in beforeEach [EXTEND]

**research says:** add default mock values for new dependencies

**why it holds:** implicit in "add mock for..." items. new mocks will need default return values in beforeEach. this is implementation detail.

### pattern 5: context object creation [REUSE]

**research says:** same ContextCli pattern can be reused

**why it holds:** no changes needed. blueprint preserves extant context pattern.

### pattern 6: flag combination tests [EXTEND]

**research says:** add test cases for --which local|global|both combinations

**blueprint says:** test coverage lists "--which local, --which global, --which both, default npx, default global"

**why it holds:** all five permutations explicitly listed in test coverage table.

### pattern 7: edge case tests [REUSE]

**research says:** apply same edge case test pattern for permission failures, npx detection

**blueprint says:** test coverage includes "EACCES, other errors" for execNpmInstallGlobal

**why it holds:** EACCES handling is an edge case. npx detection is covered in detectInvocationMethod tests.

### pattern 8: result structure assertions [EXTEND]

**research says:** add assertions for upgradedGlobal in result

**why it holds:** implicit. tests will assert on the new UpgradeResult shape which includes upgradedGlobal.

### pattern A: invocation method tests [NEW]

**research says:** create detectInvocationMethod.test.ts

**blueprint says:** detectInvocationMethod.test.ts [NEW] in filediff tree

**why it holds:** file listed with cases "npx detection, global detection".

### pattern B: global install tests [NEW]

**research says:** create execNpmInstallGlobal.test.ts

**blueprint says:** execNpmInstallGlobal.test.ts [NEW] in filediff tree

**why it holds:** file listed with cases "success, EACCES, other errors".

### pattern C: CLI integration tests [NEW] — ORIGINALLY PARTIAL, NOW FIXED

**research says:** consider invokeUpgrade.integration.test.ts for CLI integration tests

**original blueprint:** only mentioned integration test for invokeUpgrade, no acceptance test

**fixed blueprint:** added upgrade.acceptance.test.ts with blackbox CLI cases and snapshots

**why it now holds:** the test coverage table now includes acceptance layer with explicit cases for all --which flag combinations and stdout format snapshots.

## issues found

1. **acceptance test coverage absent** — blueprint should explicitly list acceptance tests for CLI contract layer per `rule.require.test-coverage-by-grain`.

## fixes applied

updated blueprint to add explicit acceptance test coverage:
- added `accept.blackbox/cli/upgrade.acceptance.test.ts` to filediff tree
- added acceptance tests section to test coverage with cases and snapshots
- added acceptance layer row to test coverage table
