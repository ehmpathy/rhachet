# self-review r7: has-consistent-mechanisms

## mechanism-by-mechanism trace

### 1. role discovery via getRoleRegistry

**blueprint says**: reuse from invokeRepoIntrospect

**checked**: `src/contract/cli/invokeRepoIntrospect.ts` lines 60-79:
- loads package entry point
- calls `packageExports.getRoleRegistry()`
- returns RoleRegistry

**verdict**: consistent — same pattern.

### 2. extractDirUris

**blueprint says**: reuse from castIntoRoleRegistryManifest

**checked**: `src/domain.operations/manifest/castIntoRoleRegistryManifest.ts` exports this.

**verdict**: consistent — reuses extant utility.

### 3. getAllFilesFromDir

**blueprint says**: reuse from infra/filesystem

**checked**: `src/infra/filesystem/getAllFilesFromDir.ts` exists with unit and integration tests.

**verdict**: consistent — reuses extant utility.

### 4. applyArtifactGlobs (new)

**question**: does this duplicate extant functionality?

**searched**: `fg.isMatch`, `glob`, `minimatch` in codebase.

**found**: no extant utility for filter by glob patterns. current uses:
- `fast-glob` used for file discovery, not filter
- no `isMatch` utility wrapper

**verdict**: not a duplicate — new transformer for specific usecase.

### 5. applyExclusions (new)

**question**: does this duplicate extant functionality?

**searched**: `exclude`, `include`, `filter` patterns in codebase.

**found**: no extant utility for inclusion/exclusion filter with precedence logic.

**verdict**: not a duplicate — new transformer for specific usecase.

### 6. copyFileWithStructure (new)

**question**: does this duplicate extant functionality?

**searched**: `copyFile`, `fs.cp`, `copy` in codebase.

**found**: no extant utility for copy files with directory structure preservation.

**verdict**: not a duplicate — new orchestrator for specific usecase.

### 7. pruneEmptyDirs (new)

**question**: does this duplicate extant functionality?

**searched**: `rmdir`, `pruneEmpty`, `removeEmpty` in codebase.

**found**: no extant utility for recursive empty directory removal.

**verdict**: not a duplicate — new orchestrator to match rsync `--prune-empty-dirs`.

### 8. assertPathWithinRepo

**blueprint says**: reuse assertPathWithinRepo pattern

**searched**: `assertPathWithinRepo` in codebase.

**found**: only in .behavior/ files, not in production code.

**verdict**: new pattern, but intentional — validates `--into` stays within repo.

### 9. BadRequestError

**blueprint uses**: for validation errors (absent dirs, outside repo, etc.)

**checked**: used consistently in `invokeRepoIntrospect.ts` for similar validations.

**verdict**: consistent — same error class for same purpose.

## summary

| mechanism | status | notes |
|-----------|--------|-------|
| getRoleRegistry | reuse | same pattern as invokeRepoIntrospect |
| extractDirUris | reuse | from castIntoRoleRegistryManifest |
| getAllFilesFromDir | reuse | from infra/filesystem |
| applyArtifactGlobs | new | no duplicate, specific usecase |
| applyExclusions | new | no duplicate, specific usecase |
| copyFileWithStructure | new | no duplicate, specific usecase |
| pruneEmptyDirs | new | no duplicate, rsync behavior |
| assertPathWithinRepo | new | new pattern, intentional |
| BadRequestError | reuse | consistent with extant usage |

## conclusion

no duplication found. new mechanisms are purpose-built for the compile command. extant mechanisms are reused where applicable.
