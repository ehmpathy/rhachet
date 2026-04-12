# self-review r4: has-pruned-yagni

## YAGNI check for each component

### 1. invokeRepoCompile.ts — CLI handler

**requested?**: yes — wish explicitly says `npx rhachet compile --from src --into dist`

**minimum viable?**: yes — a CLI entry point is required

**verdict**: keep

### 2. getAllArtifactsForRole.ts — artifact discovery

**requested?**: yes — need to discover artifacts from role structure

**minimum viable?**: yes — centralizes the discovery logic

**verdict**: keep

### 3. applyArtifactGlobs.ts — file type filter

**requested?**: yes — wish rsync has specific include patterns for .md, .sh, etc.

**minimum viable?**: yes — separates pattern logic from discovery

**verdict**: keep

### 4. applyExclusions.ts — exclusion filter

**requested?**: yes — wish explicitly has `--exclude` patterns and mentions --include/--exclude overrides

**minimum viable?**: yes — the precedence logic (exclude > include > default) needs clear encapsulation

**verdict**: keep

### 5. copyFileWithStructure.ts — file copy

**requested?**: yes — need to copy files with structure intact

**minimum viable?**: yes — 4 lines of focused logic

**verdict**: keep

### 6. pruneEmptyDirs.ts — empty dir removal

**requested?**: yes — wish rsync uses `--prune-empty-dirs`

**minimum viable?**: yes — recursive empty dir removal

**verdict**: keep

### 7. CompileArtifact.ts — domain object

**requested?**: the type field enables per-type counts in output

**question**: was per-type count output requested?

**analysis**: the wish does not explicitly request per-type counts. however:
- the type is known at collection time (we iterate by type)
- the overhead is minimal (one string field)
- output helps users verify builds

**verdict**: this is borderline YAGNI. the type field is "while we're here" convenience.

**decision**: keep for now — overhead is minimal. flag if wisher prefers simpler output.

### 8. success output format

**requested?**: no explicit output format in wish

**analysis**: the detailed format with per-type counts is UX polish, not a requirement.

**minimum viable alternative**: simple message like `compiled 25 artifacts from 2 roles`

**verdict**: the detailed output is nice-to-have. could simplify.

**decision**: keep — the output helps users verify builds. document as "may simplify if too verbose".

### 9. error output examples

**requested?**: error messages are implied by fail-fast requirements

**minimum viable?**: yes — users need clear error messages

**verdict**: keep

### 10. test coverage structure

**requested?**: tests are implied by quality requirements

**analysis**: the test tree follows rule.require.test-coverage-by-grain:
- transformers: unit tests (applyArtifactGlobs, applyExclusions)
- orchestrators: integration tests (getAllArtifactsForRole, copyFileWithStructure, pruneEmptyDirs)
- contracts: acceptance tests

**verdict**: correct pattern. keep.

## summary

| component | YAGNI? | decision |
|-----------|--------|----------|
| invokeRepoCompile.ts | no | keep |
| getAllArtifactsForRole.ts | no | keep |
| applyArtifactGlobs.ts | no | keep |
| applyExclusions.ts | no | keep |
| copyFileWithStructure.ts | no | keep |
| pruneEmptyDirs.ts | no | keep |
| CompileArtifact type field | borderline | keep (minimal overhead) |
| success output format | nice-to-have | keep (may simplify later) |
| error output examples | no | keep |
| test coverage | no | keep |

## conclusion

no components need deletion. two items are noted as "may simplify later" but the overhead is minimal and the value is clear.

no YAGNI prune needed.
