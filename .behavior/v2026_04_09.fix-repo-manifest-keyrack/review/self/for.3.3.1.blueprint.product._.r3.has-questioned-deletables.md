# self-review r3: has-questioned-deletables

## why r3 was needed

r2 traced features to the wish but did not deeply question if the design is the simplest. let me re-examine with fresh eyes.

## deeper question: can we delete components?

### question: do we need applyArtifactGlobs as a separate function?

the function is:
```ts
export const applyArtifactGlobs = (input: {
  files: string[];
  globs: string[];
}): string[] => {
  return input.files.filter((file) =>
    input.globs.some((glob) => fg.isMatch(file, glob)),
  );
};
```

could inline this in getAllArtifactsForRole. however:
- it's a pure transformer with clear single responsibility
- unit testable in isolation
- reusable if needed

**verdict**: keep. follows domain-operation-grains pattern. the separation enables clear unit tests.

### question: do we need applyExclusions as a separate function?

the function handles complex logic:
1. check custom exclusions (exclude wins)
2. check custom inclusions (overrides defaults)
3. check default exclusions

could inline, but:
- the precedence logic is non-trivial
- unit tests need to verify each case
- separation makes the orchestrator cleaner

**verdict**: keep. the logic is complex enough to warrant isolation.

### question: do we need copyFileWithStructure?

```ts
export const copyFileWithStructure = async (input: {
  source: string;
  fromDir: string;
  intoDir: string;
}): Promise<void> => {
  const relativePath = path.relative(input.fromDir, input.source);
  const destPath = path.join(input.intoDir, relativePath);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.copyFile(input.source, destPath);
};
```

this is 4 lines of logic. could inline. but:
- it's called in a loop (once per artifact)
- the relative path calculation is a clear unit of work
- integration test validates the structure preservation

**verdict**: keep. the function name documents the intent clearly.

### question: do we need pruneEmptyDirs?

the wish explicitly references `--prune-empty-dirs` from rsync. this is a required behavior.

**verdict**: keep. traces directly to wish.

### question: do we need CompileArtifact domain object?

r2 questioned this. let me dig deeper.

current: `{ source: string; type: 'brief' | 'skill' | ... }`

alternative: `string[]` (just paths)

the type enables:
1. per-type counts in output
2. potential future: different copy logic per type

is per-type count output required? no. but it's useful for verification.

could we derive type from path pattern?
- briefs: `**/briefs/**` or ends in `.md`, `.min`
- skills: `**/skills/**` or ends in `.sh`, `.jsonc`
- etc.

this would be more complex than just a tag at collection time.

**verdict**: keep. the overhead is minimal (one string field) and the alternative (derive from path) is more complex.

### question: can we simplify the CLI interface?

current: `--from src --into dist [--include] [--exclude]`

could we default --from to `src` and --into to `dist`? that would match the common case.

the wish says: `npx rhachet compile --from src --into dist`

this implies these are explicit flags, not defaults. users may have different structures.

**verdict**: keep flags as required. matches wish exactly.

## conclusion

re-examined each component with fresh eyes. each serves a clear purpose and traces to the wish. the design is already minimal.

no deletions identified. no simplifications found.
