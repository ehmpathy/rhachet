# self-review r10: has-behavior-declaration-adherance

## summary

this review checks whether the blueprint correctly implements what the vision and criteria specify. r10 coverage verified all requirements are present; this review verifies they are implemented correctly.

## adherance verification

### vision: role discovery mechanism

**vision line 48**: "discover roles via same internal logic as `rhachet repo introspect`"

**blueprint codepath tree lines 44**: `[←] discover roles via getRoleRegistry (reuse from invokeRepoIntrospect)`

**why it holds**: blueprint explicitly reuses getRoleRegistry from invokeRepoIntrospect. same discovery logic, not a reimplementation.

### vision: directory structure preservation

**vision line 21**: "relative directory structure is preserved"

**blueprint line 205-208**:
```ts
const relativePath = path.relative(input.fromDir, input.source);
const destPath = path.join(input.intoDir, relativePath);
```

**why it holds**: copyFileWithStructure computes relative path from source, then joins to dest. structure is preserved by construction.

### vision: globs applied per registered directory

**vision lines 48-50**: "for each role's directory... apply globs to find artifacts"

**blueprint lines 82-116**: getAllArtifactsForRole iterates through extractDirUris for briefs, skills, inits, then applies globs per dir.

**why it holds**: blueprint applies globs to each registered dir individually, not to the entire src/. matches vision exactly.

### criteria: exclude wins over include

**criteria matrix 2.2 line 47**: `| present (matches) | present (matches) | — | no (exclude wins) |`

**blueprint lines 173-180**:
```ts
// check custom exclusions first (exclude wins over include)
if (input.exclude?.some((pattern) => fg.isMatch(artifact, pattern))) {
  return false;
}
// check custom inclusions (overrides default exclusions)
if (input.include?.some((pattern) => fg.isMatch(artifact, pattern))) {
  return true;
}
```

**why it holds**: exclude is checked before include. if both match, exclude returns false first.

### criteria: include overrides default exclusions

**criteria matrix 2.2 line 45**: `| present (matches) | absent | no | yes |`

**blueprint lines 178-180**:
```ts
if (input.include?.some((pattern) => fg.isMatch(artifact, pattern))) {
  return true;
}
```

**why it holds**: include check comes before default exclusion check (lines 183-186). if include matches, artifact is kept regardless of default exclusion.

### criteria: dist/ contents preserved

**criteria matrix 2.2 lines 57-59**: extant dist/ files are preserved.

**blueprint mechanism**: copyFileWithStructure only calls fs.copyFile, never fs.rm or fs.rmdir on extant files.

**why it holds**: blueprint adds files but never deletes. preservation is by absence of delete operations.

### criteria: empty dirs pruned

**criteria 2.1 lines 89-92**: "empty directories are not created in dist/"

**blueprint lines 219-230**: pruneEmptyDirs recursively scans and removes dirs with no entries.

**why it holds**: prune runs after copy. any empty dirs from exclusions are removed.

### vision: error message format

**vision lines 178-183**: errors fail fast with clear messages.

**blueprint error outputs (lines 324-397)**: each error case has treestruct output with:
- `🐢 bummer dude...`
- `🐚 repo compile`
- `✋ blocked: {reason}`
- context-specific details

**why it holds**: error format matches treestruct convention from codebase. messages explain what went wrong and how to fix.

## potential deviation check

### question: is the glob match correct?

**vision line 60**: briefs use `**/*.md` and `**/*.min`

**blueprint line 89**: `globs: ['**/*.md', '**/*.min']`

**verdict**: exact match.

### question: does blueprint handle optional files correctly?

**vision lines 64-65**: boot.yml and keyrack.yml are "if present"

**blueprint lines 123-128**:
```ts
if (fs.existsSync(path.join(input.fromDir, roleDir, 'boot.yml'))) {
  artifacts.push(path.join(roleDir, 'boot.yml'));
}
if (fs.existsSync(path.join(input.fromDir, roleDir, 'keyrack.yml'))) {
  artifacts.push(path.join(roleDir, 'keyrack.yml'));
}
```

**verdict**: explicit existsSync check before push. absent files do not cause errors.

### question: does blueprint validate --into is within repo?

**vision line 179**: "--into outside repo → fail-fast, security boundary"

**blueprint codepath tree line 43**: `[←] validate --into within repo (reuse assertPathWithinRepo pattern)`

**verdict**: reuses extant pattern for path validation. security boundary enforced.

## conclusion

blueprint adheres to vision and criteria:
- discovery mechanism: reuses getRoleRegistry (correct)
- structure preservation: relative path logic (correct)
- glob application: per registered dir (correct)
- exclusion precedence: exclude > include > default (correct)
- dist/ preservation: no delete operations (correct)
- empty dir prune: recursive removal (correct)
- error format: treestruct with clear messages (correct)
- optional files: existsSync guard (correct)
- security: assertPathWithinRepo reuse (correct)

no deviations found.
