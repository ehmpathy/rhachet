# self-review r6: has-pruned-yagni

## confirmation of r5 fixes

r5 identified two YAGNI items:
1. **CompileArtifact domain object** — type field is not used after collection
2. **per-type count output** — wish does not specify output format

both fixes applied to blueprint.

### fix 1: CompileArtifact → string[]

**before**:
```ts
): Promise<CompileArtifact[]> => {
  const artifacts: CompileArtifact[] = [];
  artifacts.push(...matched.map(f => ({ source: f, type: 'brief' })));
```

**after**:
```ts
): Promise<string[]> => {
  const artifacts: string[] = [];
  artifacts.push(...matched);
```

the type field was traced through every usage — it was collected but never read.

### fix 2: per-type count → total count

**before**:
```
🐚 repo compile
   └─ roles
      ├─ repo=.this/role=mechanic
      │  ├─ briefs: 12
      │  ├─ skills: 8
      │  └─ keyrack: 1
      └─ compiled 25 artifacts
```

**after**:
```
🐚 repo compile
   ├─ from: src
   ├─ into: dist
   └─ compiled 25 artifacts from 2 roles
```

## final YAGNI sweep

| component | YAGNI? | why it holds |
|-----------|--------|--------------|
| invokeRepoCompile | no | CLI entry point is required |
| getAllArtifactsForRole | no | centralizes artifact discovery |
| applyArtifactGlobs | no | filters by file type per wish rsync includes |
| applyExclusions | no | handles precedence logic (exclude > include > default) |
| copyFileWithStructure | no | 4 lines, clear purpose, tested |
| pruneEmptyDirs | no | wish rsync uses --prune-empty-dirs |
| unit tests | no | follows rule.require.test-coverage-by-grain |
| integration tests | no | follows rule.require.test-coverage-by-grain |
| acceptance tests | no | validates CLI contract |

## why holds

each component traces to:
1. an explicit rsync flag in the wish, or
2. a structural requirement (CLI entry, test coverage), or
3. domain-operation-grains pattern (transformers vs orchestrators)

## conclusion

both r5 YAGNI items fixed. blueprint is minimal.
