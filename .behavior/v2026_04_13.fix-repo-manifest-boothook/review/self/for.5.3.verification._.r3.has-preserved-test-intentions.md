# self review: has-preserved-test-intentions

## the question

did i preserve test intentions? did i fix test failures via code fixes, or did i weaken assertions?

## tests i touched

### 1. invokeRepoIntrospect.integration.test.ts

**what changed:** added `hooks.onBrain.onBoot` to the mock Role in test setup.

**why it failed:** my new guard `assertRegistryBootHooksDeclared` requires roles with bootable content to declare a boot hook. the test fixture had `briefs.dirs` and `skills.dirs` but no `hooks.onBrain.onBoot`.

**what i did:** added the boot hook declaration to the test fixture.

**intention preserved?** yes. the test still verifies `invokeRepoIntrospect` works correctly. i made the fixture comply with the new contract — i did not remove or weaken any assertions.

### 2. new test files (not touched, created fresh)

- `assertRegistryBootHooksDeclared.test.ts` — new unit tests for the new guard
- `findRolesWithBootableButNoHook.test.ts` — new unit tests for the transformer
- `repo.introspect.acceptance.test.ts` case9 — new acceptance test for the failure path

these are new tests. no prior intention to preserve.

## what i did NOT do

- i did NOT remove any assertions
- i did NOT weaken any expectations
- i did NOT change expected values to match broken output
- i did NOT delete tests that fail

## the one change explained

the integration test fix was correct. the test fixture lacked boot hooks. my new guard requires boot hooks for roles with bootable content. the fix was to add boot hooks to the fixture — the same fix a real role author would need to apply.

this is not a weakened assertion. this is fixture compliance with a new contract.

## conclusion

holds. test intentions preserved. the one test file i modified was fixed via fixture compliance with the new contract, not via weakened assertions.
