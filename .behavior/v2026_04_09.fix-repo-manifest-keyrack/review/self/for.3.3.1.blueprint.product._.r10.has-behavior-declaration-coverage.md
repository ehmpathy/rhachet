# self-review r10: has-behavior-declaration-coverage

## summary of r9

r9 found 2 gaps in default exclusion patterns and applied fixes. this review verifies WHY the fix holds and confirms all other requirements are addressed.

## verification of fixes applied

### fix 1: `__test_*/**` exclusion

**vision line 73**: `__test_*/**` — test assets

**criteria 2.1 lines 35-38**:
```
given(role with `__test_assets__/` directory)
  when(user runs `npx rhachet repo compile --from src --into dist`)
    then(`__test_*/**` files are excluded)
      sothat(test assets are not distributed)
```

**criteria matrix 2.2 line 28**: `| __test_*/** | __test_assets__/data.json | yes |`

**blueprint after fix** (line 134 in getAllArtifactsForRole):
```ts
defaultExclusions: ['.test/**', '__test_*/**', '.route/**', ...]
```

**why it holds**: the `__test_*/**` pattern now matches criteria matrix exactly. `__test_assets__/data.json` will be excluded as specified.

### fix 2: `.*` exclusion

**vision line 76**: `.*` — hidden directories

**criteria 2.1 lines 50-53**:
```
given(role with hidden directories like `.cache/`)
  when(user runs `npx rhachet repo compile --from src --into dist`)
    then(`.*` directories are excluded)
      sothat(hidden files are not distributed)
```

**criteria matrix 2.2 line 33**: `| .* | .cache/ | yes |`

**blueprint after fix** (line 134 in getAllArtifactsForRole):
```ts
defaultExclusions: [..., '*.test.*', '.*'],
```

**why it holds**: the `.*` pattern now matches criteria matrix exactly. `.cache/` and other hidden directories will be excluded as specified.

## vision requirements — full trace

### artifact types trace

| artifact | vision ref | blueprint ref | why it holds |
|----------|-----------|---------------|--------------|
| briefs `**/*.md` | line 60 | line 89 | applyArtifactGlobs with same globs |
| briefs `**/*.min` | line 60 | line 89 | applyArtifactGlobs with same globs |
| skills `**/*.sh` | line 61 | line 101 | applyArtifactGlobs with same globs |
| skills `**/*.jsonc` | line 61 | line 101 | applyArtifactGlobs with same globs |
| skills `**/template/**` | line 61 | line 101 | applyArtifactGlobs with same globs |
| skills `**/templates/**` | line 61 | line 101 | applyArtifactGlobs with same globs |
| inits `**/*.sh` | line 62 | line 114 | applyArtifactGlobs with same globs |
| inits `**/*.jsonc` | line 62 | line 114 | applyArtifactGlobs with same globs |
| readme.md | line 63 | lines 120-122 | explicit check for readme.md |
| boot.yml | line 64 | lines 123-125 | explicit check for boot.yml |
| keyrack.yml | line 65 | lines 126-128 | explicit check for keyrack.yml |

**why complete**: all 11 artifact globs from vision table appear verbatim in blueprint.

### exclusion patterns trace (after fix)

| pattern | vision ref | criteria ref | blueprint ref | why it holds |
|---------|-----------|--------------|---------------|--------------|
| `.test/**` | line 71 | line 32 | line 134 | explicit in defaultExclusions |
| `__test_*/**` | line 72 | line 37 | line 134 | added in r9 fix |
| `.route/**` | line 73 | line 41 | line 134 | explicit in defaultExclusions |
| `.scratch/**` | line 74 | line 41 | line 134 | explicit in defaultExclusions |
| `.behavior/**` | line 75 | line 41 | line 134 | explicit in defaultExclusions |
| `*.test.*` | line 76 | line 47 | line 134 | explicit in defaultExclusions |
| `.*` | line 77 | line 52 | line 134 | added in r9 fix |

**why complete**: all 7 exclusion patterns from vision appear in defaultExclusions.

### CLI flags trace

| flag | vision ref | criteria ref | blueprint ref | why it holds |
|------|-----------|--------------|---------------|--------------|
| `--from` | line 44 | line 7 | line 295 | explicit in CLI interface |
| `--into` | line 44 | line 7 | line 295 | explicit in CLI interface |
| `--include` | line 82 | line 58 | line 295 | explicit in CLI interface |
| `--exclude` | line 91 | line 65 | line 295 | explicit in CLI interface |

**why complete**: all 4 flags from vision appear in CLI interface table.

### error cases trace

| error | vision ref | criteria ref | blueprint ref | why it holds |
|-------|-----------|--------------|---------------|--------------|
| absent --into | line 178 | lines 96-103 | lines 345-352 | error output example |
| absent --from | — | lines 105-113 | lines 324-331 | error output example |
| --into outside repo | line 179 | lines 115-121 | lines 333-342 | error output example |
| no package.json | line 180 | lines 123-130 | lines 354-362 | error output example |
| no .agent/ | line 181 | lines 132-139 | lines 364-374 | error output example |
| no roles | line 182 | lines 141-148 | lines 376-386 | error output example |
| role dir absent | line 183 | — | lines 388-397 | error output example |

**why complete**: all 7 error cases have error output examples with expected format.

## criteria matrix 2.2 — full trace

### matrix.1 artifact inclusion — complete

all 11 rows match vision artifact table, all present in blueprint.

### matrix.2 default exclusions — complete (after fix)

all 7 rows now present in blueprint's defaultExclusions array.

### matrix.3 override behavior — complete

```
| include | exclude | default | copied | blueprint mechanism |
|---------|---------|---------|--------|---------------------|
| absent | absent | yes | yes | return true at line 188 |
| absent | absent | no | no | applyArtifactGlobs filters first |
| present | absent | no | yes | lines 179-180 check include |
| absent | present | yes | no | lines 174-176 check exclude |
| present | present | — | no | lines 174-176 exclude wins |
```

**why complete**: applyExclusions checks exclude first (lines 174-176), then include (lines 178-180), then default (lines 183-186). order matches "exclude wins" semantics.

### matrix.4 dist/ preservation — complete

**blueprint mechanism**: copyFileWithStructure adds files but never removes extant. no delete operation.

**acceptance test case**: "dist/ preserved" at line 288.

### matrix.5 input validation errors — complete

all 7 error cases traced above.

### matrix.6 empty directory prune — complete

**blueprint mechanism**: pruneEmptyDirs at lines 215-231 recursively removes empty dirs.

**acceptance test case**: "empty dirs pruned" at line 287.

## conclusion

all requirements from vision and criteria are addressed in the blueprint:
- 11 artifact globs: all present
- 7 exclusion patterns: all present (2 added in r9)
- 4 CLI flags: all present
- 7 error cases: all present with output examples
- 6 criteria matrices: all covered

no gaps found.
