# self-review: has-zero-test-skips (r2)

## why zero skips holds

### the behavior does not require external credentials

the upgrade global feature operates entirely within the local system:

1. **detectInvocationMethod** — reads `process.env.npm_execpath`
   - pure environment check
   - no external service
   - no credentials needed

2. **getGlobalRhachetVersion** — calls `npm list -g rhachet --json`
   - local npm command
   - queries local package manager state
   - no credentials needed

3. **execNpmInstallGlobal** — calls `npm install -g rhachet@latest`
   - local npm command
   - fetches from public npm registry
   - no auth needed (public package)

4. **execUpgrade orchestrator** — composes the above
   - uses dependency injection via context
   - all dependencies are mockable
   - no credential secrets in tests

### the behavior does not have flaky external dependencies

unlike the 2 failed integration tests (which require OPENAI_API_KEY and XAI_API_KEY for external brain services), the upgrade global feature:

- does not call external APIs
- does not require network auth tokens
- does not depend on third-party service availability

the unit tests mock `spawnSync` to test the logic without actual npm invocation. the acceptance tests verify CLI output format without actual global installs.

### no prior failures carried forward

all 4 new test files were created for this behavior:
- detectInvocationMethod.test.ts — all cases pass
- getGlobalRhachetVersion.test.ts — all cases pass
- execNpmInstallGlobal.test.ts — all cases pass
- execUpgrade.test.ts (extended) — all cases pass

no prior test failures were inherited. no .skip() was used to bypass broken tests.

## conclusion

zero skips holds because:
1. no external credentials required
2. no flaky external dependencies
3. all new tests were written fresh and pass
