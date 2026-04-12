# self-review r8: has-consistent-mechanisms

## summary of r7

r7 traced each mechanism and concluded no duplication. this review verifies that conclusion by stating WHY each non-duplicate holds.

## why each reused mechanism is correct

### getRoleRegistry pattern

**why it holds**: `invokeRepoIntrospect` already established the pattern for role discovery. the blueprint says "reuse from invokeRepoIntrospect" — this is correct because:
1. same entry point resolution logic (package.json main field)
2. same export contract (getRoleRegistry function)
3. same registry shape returned

no new pattern needed.

### extractDirUris

**why it holds**: `castIntoRoleRegistryManifest.ts` already extracts directory URIs from role definitions. the blueprint says "reuse from castIntoRoleRegistryManifest" — this is correct because:
1. same input shape (role.briefs?.dirs, role.skills?.dirs, role.inits?.dirs)
2. same output shape (string[])
3. same edge cases handled (null, undefined, array vs single)

no new utility needed.

### getAllFilesFromDir

**why it holds**: `infra/filesystem/getAllFilesFromDir.ts` already recursively lists files. the blueprint says "reuse from infra/filesystem" — this is correct because:
1. already has unit and integration tests
2. handles symbolic links correctly
3. returns absolute paths

no new utility needed.

## why each new mechanism is not a duplicate

### applyArtifactGlobs

**why it holds**: searched for `fg.isMatch`, `glob`, `minimatch` patterns in codebase.

- `fast-glob` is used for file **discovery** (fg.sync)
- no extant utility wraps `fg.isMatch` for **filter**

the blueprint needs to filter an already-collected file list by glob patterns. this is distinct from file discovery. a new transformer is correct.

### applyExclusions

**why it holds**: searched for `exclude`, `include`, `filter` patterns in codebase.

- no extant utility combines default exclusions with user overrides
- no extant utility implements the precedence: exclude > include > default

the blueprint needs multi-layer exclusion logic with override semantics. a new transformer is correct.

### copyFileWithStructure

**why it holds**: searched for `copyFile`, `fs.cp`, `copy` patterns in codebase.

- `fs.copyFile` is a Node.js primitive
- no extant utility wraps it with directory creation

the blueprint needs to copy with mkdirp for parent dirs. a new orchestrator is correct.

### pruneEmptyDirs

**why it holds**: searched for `rmdir`, `pruneEmpty`, `removeEmpty` patterns in codebase.

- no extant utility for recursive empty directory removal
- rsync `--prune-empty-dirs` behavior not previously needed

the blueprint matches rsync behavior. a new orchestrator is correct.

### assertPathWithinRepo

**why it holds**: searched for `assertPathWithinRepo` in codebase.

- only in .behavior/ files, not in production code
- this is a NEW pattern for repo compile safety

the blueprint adds blast radius protection for `--into`. a new assertion is correct and intentional.

## conclusion

r7 findings verified:
- reused mechanisms are correct — they already solve the problem
- new mechanisms are correct — they solve problems not yet solved

no changes needed. blueprint mechanisms are consistent.
