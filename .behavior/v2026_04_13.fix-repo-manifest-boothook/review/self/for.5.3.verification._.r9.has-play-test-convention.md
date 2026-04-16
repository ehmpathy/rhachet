# self review: has-play-test-convention (round 9)

## the question

are journey tests named correctly per the `.play.test.ts` convention?

## this repo's convention

this repo does NOT use the `.play.test.ts` suffix. instead:

| test type | location | suffix |
|-----------|----------|--------|
| unit | `src/**/*.test.ts` | `.test.ts` |
| integration | `src/**/*.integration.test.ts` | `.integration.test.ts` |
| acceptance | `blackbox/**/*.acceptance.test.ts` | `.acceptance.test.ts` |

**evidence:**

```
$ glob "**/*.play*.test.ts"
(no results)

$ glob "**/*.acceptance.test.ts"
blackbox/cli/repo.introspect.acceptance.test.ts
blackbox/cli/roles.boot.acceptance.test.ts
... (65+ acceptance tests)
```

## is this fallback acceptable?

the guide says: "if not supported, is the fallback convention used?"

**yes.** the fallback convention in this repo is:
- journey tests live in `blackbox/`
- journey tests use `.acceptance.test.ts` suffix

this is consistent across the entire repo.

## test files for this behavior

| file | suffix | type | convention? |
|------|--------|------|-------------|
| `blackbox/cli/repo.introspect.acceptance.test.ts` | `.acceptance.test.ts` | acceptance | correct |
| `src/contract/cli/invokeRepoIntrospect.integration.test.ts` | `.integration.test.ts` | integration | correct |
| `src/domain.operations/manifest/assertRegistryBootHooksDeclared.test.ts` | `.test.ts` | unit | correct |
| `src/domain.operations/manifest/findRolesWithBootableButNoHook.test.ts` | `.test.ts` | unit | correct |

**all test files follow the repo's conventions.**

## conclusion

holds. this repo uses `.acceptance.test.ts` as its journey test convention. the new tests follow this pattern. no deviation from repo conventions.

