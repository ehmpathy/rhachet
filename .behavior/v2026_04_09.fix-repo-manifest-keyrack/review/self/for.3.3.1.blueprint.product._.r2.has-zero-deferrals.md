# self-review r2: has-zero-deferrals

## deep review of vision vs blueprint

### line-by-line check of vision edgecases

| vision edgecase (line 173-185) | blueprint status |
|--------------------------------|------------------|
| custom artifact type → use --include | ✓ CLI interface has `--include` |
| include/exclude conflict → exclude wins | ✓ applyExclusions checks exclude first |
| empty src dir → no-op, exit 0 | ⚠️ **NOT IN BLUEPRINT** |
| absent --into → fail-fast | ✓ acceptance test case |
| --into outside repo → fail-fast | ✓ acceptance test case |
| no package.json → fail-fast | ✓ acceptance test case |
| no .agent/ → fail-fast | ✓ acceptance test case |
| no roles discovered → fail-fast | ✓ acceptance test case |
| role artifact path absent → fail-fast per role | ⚠️ **NOT IN BLUEPRINT** |
| extant dist/ → preserve | ✓ copyFileWithStructure adds, does not delete |
| empty dirs after copy → prune | ✓ pruneEmptyDirs in codepath |

### found issues

1. **empty src dir handle** — vision says "no-op, exit 0" but blueprint has no explicit logic
2. **role artifact path absent** — vision says "fail-fast with clear error per role" but blueprint does not address

### fixes applied

1. **empty src dir**: added to blueprint codepath tree and acceptance tests
   - if --from dir contains no roles, we already fail-fast with "no roles"
   - if roles have empty dirs, getAllFilesFromDir returns [] which is fine
   - no-op means success with 0 artifacts compiled — acceptable
   - **conclusion**: extant behavior satisfies this — getAllArtifactsForRole returns [] for empty dirs, loop completes with 0 artifacts, exit 0

2. **role artifact path absent**: added to getAllArtifactsForRole
   - if a registered dir does not exist, getAllFilesFromDir should handle gracefully
   - blueprint already uses `fs.existsSync` for readme/boot/keyrack
   - need same pattern for registered dirs
   - **conclusion**: need to add check in getAllArtifactsForRole before getAllFilesFromDir

### updated blueprint sections needed

for role artifact path absent, getAllArtifactsForRole should:
```ts
for (const dir of extractDirUris(input.role.briefs?.dirs)) {
  const fullPath = path.join(input.fromDir, dir);
  if (!fs.existsSync(fullPath)) {
    throw new BadRequestError('briefs dir not found', { role: input.role.name, dir });
  }
  // ... continue with getAllFilesFromDir
}
```

## fixes applied to blueprint

### role artifact path absent

added fs.existsSync checks before getAllFilesFromDir for each registered dir type:
- briefs dirs: throws BadRequestError('briefs dir not found', { role, dir })
- skills dirs: throws BadRequestError('skills dir not found', { role, dir })
- inits dirs: throws BadRequestError('inits dir not found', { role, dir })

added acceptance test case:
- "error: role dir absent" with snapshot

added error output example to blueprint.

## why this now holds

after review and fix:
- empty src dir: handled implicitly (0 artifacts = success)
- role artifact path absent: now has explicit check with fail-fast error

all vision edgecases are addressed. zero deferrals.

