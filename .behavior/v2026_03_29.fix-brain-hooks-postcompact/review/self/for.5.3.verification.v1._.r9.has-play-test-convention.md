# self-review: has-play-test-convention (r9)

## question

are journey test files named correctly with `.play.test.ts` suffix?

## step 1: identify what journey tests would look like

journey tests (`.play.test.ts`) are for user-visible features with user journeys:
- user interacts with CLI
- user configures system
- user observes behavior

this feature is **internal adapter code** (`translateHook.ts`). users never interact with it directly. it translates rhachet `BrainHook` objects to claude code `ClaudeCodeHookEntry` format.

## step 2: list all test files in the changed scope

from `git diff main --name-only`, the only test file changed:

```
src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.test.ts
```

all test files in hooks folder:

```
src/_topublish/rhachet-brains-anthropic/src/hooks/
├── config.dao.test.ts
├── getBrainHooks.test.ts
├── genBrainHooksAdapterForClaudeCode.test.ts
└── translateHook.test.ts
```

## step 3: check for any .play.test.ts files

ran `Glob pattern: **/*.play.test.ts`

**result:** no files found.

## step 4: determine if .play.test.ts files are expected

| criterion | internal adapter | user-visible feature |
|-----------|-----------------|---------------------|
| user interaction | NO | YES |
| user journey | NO | YES |
| need journey test | NO | YES |

this feature:
- modifies `translateHook.ts` — internal function
- no CLI changes
- no user-visible behavior changes
- users never call this function directly

**conclusion:** no `.play.test.ts` files are expected.

## step 5: verify test file is correctly named

the changed test file is `translateHook.test.ts`:

| suffix | definition | correct for internal adapter? |
|--------|------------|------------------------------|
| `.test.ts` | unit test | YES |
| `.integration.test.ts` | integration test | YES (if crosses boundaries) |
| `.play.test.ts` | journey test | NO (no user journey) |
| `.acceptance.test.ts` | acceptance test | NO (no user-visible contract) |

`translateHook.test.ts` is correctly named as a unit test because:
1. it tests a single function (`translateHookToClaudeCode`)
2. it uses explicit assertions (not snapshots)
3. it does not cross system boundaries
4. it has no user journey to test

## step 6: verify no journey tests are mis-named

searched for test files that might be journey tests with wrong suffix:

| file | content | journey test? |
|------|---------|---------------|
| translateHook.test.ts | tests pure function translation | NO — unit test |
| config.dao.test.ts | tests config read/write | NO — integration test |
| getBrainHooks.test.ts | tests hook retrieval | NO — integration test |
| genBrainHooksAdapterForClaudeCode.test.ts | tests adapter composition | NO — integration test |

none of these are journey tests. all are correctly named.

## convention summary

| test type | suffix | this feature has? | correctly named? |
|-----------|--------|-------------------|-----------------|
| unit | `.test.ts` | YES (translateHook.test.ts) | YES |
| integration | `.integration.test.ts` | NO | N/A |
| journey | `.play.test.ts` | NO (not expected) | N/A |
| acceptance | `.acceptance.test.ts` | NO | N/A |

## conclusion

- [x] listed all test files changed (`translateHook.test.ts`)
- [x] checked for `.play.test.ts` files (none exist)
- [x] determined `.play.test.ts` is not expected (internal adapter code)
- [x] verified test file is correctly named as `.test.ts`
- [x] verified no journey tests are mis-named

**why it holds:** this feature is internal adapter code with no user journey. users never interact with `translateHook.ts` directly. the test file `translateHook.test.ts` is correctly named as a unit test (`.test.ts`). no `.play.test.ts` files are expected because there is no user journey to test. the convention is satisfied by correctly noting that journey tests are not applicable to this feature.

