# self review: has-zero-test-skips (round 2)

## pause to reflect

the first review was too quick. let me slow down and truly examine.

## the core question

did i add any test skips? did i remove any i found?

## what i actually did

i searched through the new code files:
- `src/domain.operations/manifest/assertRegistryBootHooksDeclared.ts`
- `src/domain.operations/manifest/findRolesWithBootableButNoHook.ts`
- `src/domain.operations/manifest/assertRegistryBootHooksDeclared.test.ts`
- `src/domain.operations/manifest/findRolesWithBootableButNoHook.test.ts`
- `blackbox/cli/repo.introspect.acceptance.test.ts` (case9)
- `src/contract/cli/invokeRepoIntrospect.integration.test.ts` (fix)

none of these files contain `.skip()` or `.only()`.

## the pre-extant skips

the test output shows 9 skipped test suites and 26 skipped tests. these are:

1. keyrack --prikey tests for `gap.3: deferred` feature (prikey fallback for unlock)
2. brain tests that need OpenAI API credentials

these are not my skips to remove. they are:
- intentionally deferred features (gap.3)
- credential-gated tests (pre-extant infrastructure)

i did not add them. i did not touch them.

## what about the fix i made?

the fix to `invokeRepoIntrospect.integration.test.ts` was NOT a skip workaround.

the test failed because my new guard requires boot hooks. the test fixture lacked them. i added the hooks to the fixture. this is the correct fix — i made the fixture comply with the new requirement.

i did not:
- skip the failed test
- remove the assertion
- mock the guard away

i fixed the fixture to match the new contract.

## conclusion

holds. zero new skips. the pre-extant skips are outside this behavior's scope.
