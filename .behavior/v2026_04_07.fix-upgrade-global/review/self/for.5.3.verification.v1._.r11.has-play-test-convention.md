# self-review: has-play-test-convention (r11)

## the question

> are journey test files named correctly with `.play.test.ts` suffix?

## verification methodology

1. searched for `.play.test.ts` files — none found
2. examined each test file created for this behavior
3. verified each test is correctly categorized (not a journey test)

## search results

```bash
$ find . -name "*.play.test.ts"
# (no results)

$ find . -name "*.play.*.test.ts"
# (no results)
```

## test file analysis

### new test files for this behavior

| file | grain | test type | is play test? | correct? |
|------|-------|-----------|---------------|----------|
| `detectInvocationMethod.test.ts` | transformer | unit | no | yes |
| `execNpmInstallGlobal.test.ts` | communicator | unit (mocked) | no | yes |
| `getGlobalRhachetVersion.test.ts` | communicator | unit (mocked) | no | yes |
| `execUpgrade.test.ts` (extended) | orchestrator | unit (mocked) | no | yes |

### why each is correctly categorized

**detectInvocationMethod.test.ts**
- tests a pure transformer
- input: `process.env.npm_execpath`
- output: `'npx' | 'global'`
- no user journey involved

**execNpmInstallGlobal.test.ts**
- tests a communicator with mocked `spawnSync`
- verifies npm command formation
- verifies error handler paths
- no user journey involved

**getGlobalRhachetVersion.test.ts**
- tests a communicator with mocked `spawnSync`
- verifies json parse for npm and pnpm formats
- no user journey involved

**execUpgrade.test.ts (new cases)**
- tests orchestrator with mocked dependencies
- verifies `--which` flag routes to correct code paths
- verifies default behavior based on invocation method
- no user journey involved

## what would make a test a play test?

a play test replays a user journey:
- multi-step workflow from user perspective
- no mocks — exercises real system
- validates end-to-end behavior
- typically reproduces a bug or validates a feature flow

example (hypothetical):
```typescript
// upgrade-global.play.test.ts
describe('upgrade global journey', () => {
  given('user has rhachet installed globally', () => {
    when('user runs rhx upgrade', () => {
      then('global is upgraded', async () => {
        // actually run the CLI
        // verify real global install changed
      });
    });
  });
});
```

this behavior does NOT have such a test because:
1. global npm install cannot be tested in CI (permission issues)
2. this is a feature addition, not a bug fix
3. unit tests with mocks verify the logic

## conclusion

play test convention check passes:
- no `.play.test.ts` files exist in this behavior
- all test files are correctly categorized as unit tests
- each test file tests its grain in isolation
- no user journey to replay (feature request, not bug fix)
