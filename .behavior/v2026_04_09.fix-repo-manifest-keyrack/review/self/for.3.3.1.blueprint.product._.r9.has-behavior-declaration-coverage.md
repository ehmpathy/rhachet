# self-review r9: has-behavior-declaration-coverage

## summary

reviewed vision and criteria yields against blueprint. found 2 gaps in default exclusion patterns.

## vision requirements

### artifact types — all covered

| artifact | vision globs | blueprint |
|----------|-------------|-----------|
| briefs | `**/*.md`, `**/*.min` | yes |
| skills | `**/*.sh`, `**/*.jsonc`, `**/template/**`, `**/templates/**` | yes |
| inits | `**/*.sh`, `**/*.jsonc` | yes |
| readme | `readme.md` | yes |
| boot | `boot.yml` | yes |
| keyrack | `keyrack.yml` | yes |

no gaps.

### default exclusions — 2 gaps found

| vision pattern | example | blueprint |
|---------------|---------|-----------|
| `.test/**` | `.test/fixtures/` | yes |
| `__test_*/**` | `__test_assets__/data.json` | **no** |
| `.route/**` | `.route/current.json` | yes |
| `.scratch/**` | `.scratch/wip.md` | yes |
| `.behavior/**` | `.behavior/v1/` | yes |
| `*.test.*` | `foo.test.sh` | yes |
| `.*` | `.cache/` | **no** |

**gap 1**: `__test_*/**` pattern absent from blueprint's defaultExclusions.

**gap 2**: `.*` (hidden dirs) pattern absent from blueprint's defaultExclusions.

### usecases — all covered

| usecase | blueprint |
|---------|-----------|
| build a role package | invokeRepoCompile |
| customize inclusions | --include flag |
| customize exclusions | --exclude flag |
| mixed include/exclude | applyExclusions |

### edgecases — all covered

| edgecase | blueprint |
|----------|-----------|
| custom artifact type | --include |
| conflicting include/exclude | exclude wins (applyExclusions) |
| empty src dir | implied (empty artifacts array) |
| missing --into | acceptance test |
| --into outside repo | acceptance test |
| no package.json | acceptance test |
| no .agent/ | acceptance test |
| no roles | acceptance test |
| role dir absent | acceptance test |
| extant dist/ | acceptance test (preserved) |
| empty dirs after copy | pruneEmptyDirs |

## criteria 2.1 check

all 7 usecases addressed. all 7 error cases addressed. all 2 output cases addressed.

exception: usecase.2 (default exclusions) missing 2 patterns per gap analysis above.

## criteria matrix 2.2 check

all 6 matrices addressed.

exception: matrix.2 (default exclusions) missing 2 patterns per gap analysis above.

## fixes applied

### fix 1: add `__test_*/**` exclusion

in getAllArtifactsForRole, updated defaultExclusions:

```diff
- defaultExclusions: ['.test/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*'],
+ defaultExclusions: ['.test/**', '__test_*/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*', '.*'],
```

### fix 2: add `.*` exclusion

same edit as above — `.*` pattern added to catch hidden directories.

## conclusion

2 gaps found and fixed:
1. `__test_*/**` exclusion for test asset directories
2. `.*` exclusion for hidden directories

blueprint now covers all requirements from vision and criteria.
