# self-review r5: has-pruned-yagni

## approach

instead of defend each component, I will try to DELETE each one and see if the design works without it. if deletion breaks the design, the component is necessary.

## deletion attempt 1: CompileArtifact domain object

**try to delete**: replace `CompileArtifact` with `string` (just the source path)

**current**: `{ source: string; type: 'brief' | 'skill' | ... }`

**after delete**: `string` (just the path)

**does it break?**:

let me trace the type field usage:
1. collected in getAllArtifactsForRole — we know the type at collection time
2. used in applyExclusions — filters by source path, type not needed
3. used in copyFileWithStructure — copies source to dest, type not needed
4. used in output — with simplified output, type not needed

**verdict**: the type field is not used after collection. DELETE.

**fix applied**: remove CompileArtifact domain object. use `string[]` for artifact paths.

## deletion attempt 2: applyArtifactGlobs function

**try to delete**: inline the filter logic in getAllArtifactsForRole

**current code**:
```ts
const matched = applyArtifactGlobs({ files, globs: ['**/*.md', '**/*.min'] });
```

**after delete**:
```ts
const matched = files.filter(f => globs.some(g => fg.isMatch(f, g)));
```

**does it break?**:
- the logic is 1 line
- it's called 3 times (briefs, skills, inits)
- inline duplication vs separate function

**verdict**: follows single-responsibility principle. the function name documents intent. KEEP.

## deletion attempt 3: applyExclusions function

**try to delete**: inline the filter logic in getAllArtifactsForRole

**does it break?**:
- the logic handles precedence (exclude > include > default)
- this is non-trivial logic
- unit tests verify each case

**verdict**: complex logic warrants separation. KEEP.

## deletion attempt 4: copyFileWithStructure function

**try to delete**: inline in invokeRepoCompile

**current**: 4 lines of code

**does it break?**:
- called in a loop for each artifact
- could inline as `for (const path of artifacts) { ... }`
- the function name documents intent clearly

**verdict**: borderline. function name adds clarity. KEEP.

## deletion attempt 5: pruneEmptyDirs function

**try to delete**: inline in invokeRepoCompile

**does it break?**:
- recursive logic
- matches rsync --prune-empty-dirs
- warrants own test

**verdict**: complex recursive logic. KEEP.

## deletion attempt 6: separate test files

**try to delete**: merge copyFileWithStructure.integration.test.ts into invokeRepoCompile.integration.test.ts

**does it break?**:
- follows rule.require.test-coverage-by-grain
- each domain operation gets its own test

**verdict**: pattern compliance. KEEP.

## deletion attempt 7: per-type counts in output

**already deleted in r5**. output simplified to total count only.

## fixes applied

1. deleted CompileArtifact domain object — use `string[]` instead
2. deleted per-type counts in output — simplified to total count

## updated blueprint sections

### filediff tree update
remove: `domain.objects/[+] CompileArtifact.ts`

### getAllArtifactsForRole update
return type changes from `Promise<CompileArtifact[]>` to `Promise<string[]>`

### applyExclusions update
input/output changes from `CompileArtifact[]` to `string[]`

## conclusion

two deletions made:
1. CompileArtifact domain object (type field was YAGNI)
2. per-type counts in output (simplified)

all other components survived deletion attempts — they are necessary.
