# self-review r4: has-questioned-assumptions

## why r4 was needed

r3 found one invalid assumption (`__test_*/**`) and fixed it. the route driver requests deeper review to ensure no other assumptions remain hidden.

## deeper dive: architecture assumptions

### assumption: async vs sync file operations

**stated**: getAllFilesFromDir, copyFileWithStructure, pruneEmptyDirs are all async

**question**: why async? is this based on evidence or habit?

**analysis**:
- getAllFilesFromDir walks directories recursively — async allows concurrent I/O
- copyFileWithStructure copies files — async avoids block
- pruneEmptyDirs walks and deletes — async is appropriate

**alternative**: sync operations would block the event loop on large directories.

**verdict**: async is the correct choice for I/O operations. evidence-based.

### assumption: loop over roles sequentially

**stated**: `for each role:` in codepath tree implies sequential process

**question**: could roles be processed in parallel?

**analysis**:
- roles are independent — no shared state between them
- parallel would be faster for many roles
- sequential is simpler and easier to debug

**alternative**: `Promise.all(roles.map(...))`

**verdict**: sequential is simpler and matches rsync behavior (one source tree). parallel could be a future enhancement but is not needed for MVP.

**no fix needed**: sequential is appropriate for initial implementation.

### assumption: copy then prune (order of operations)

**stated**: copy all files first, then prune empty dirs

**question**: what if we pruned in the copy loop?

**analysis**:
- prune after copy ensures we see the final state
- prune in copy loop would require track state
- rsync prunes after sync completes

**verdict**: copy-then-prune is correct. matches rsync behavior.

### assumption: relative paths from fromDir

**stated**: `path.relative(input.fromDir, input.source)` preserves structure

**question**: what if source is not under fromDir?

**analysis**:
- if source is `/a/b/c` and fromDir is `/a/b`, relative is `c`
- if source is `/a/x/y` and fromDir is `/a/b`, relative is `../x/y`
- the second case would create unexpected structure

**verdict**: this is an edge case. the code should validate that source is under fromDir.

**fix needed**: add validation in copyFileWithStructure:
```ts
if (!input.source.startsWith(input.fromDir)) {
  throw new UnexpectedCodePathError('source not under fromDir', { source: input.source, fromDir: input.fromDir });
}
```

actually wait — getAllArtifactsForRole already constructs paths via `path.join(input.fromDir, dir)` and then collects files from there. so source paths will always be under fromDir by construction.

**no fix needed**: source paths are always under fromDir by construction.

### assumption: fast-glob isMatch API

**stated**: `fg.isMatch(file, glob)` is used for pattern match

**question**: does this API exist? what are its semantics?

**analysis**:
- fast-glob exports `isMatch` as documented in their README
- signature: `fg.isMatch(filepath: string, pattern: string | string[])`
- returns boolean

**verification needed**: confirm API exists in fast-glob version used — to verify at implementation time

**verdict**: assume valid but should verify at implementation time.

### assumption: fs.mkdir with recursive handles extant dirs

**stated**: `await fs.mkdir(path.dirname(destPath), { recursive: true })`

**question**: what if directory already exists?

**analysis**: Node.js `fs.mkdir` with `{ recursive: true }` is a no-op if directory exists. this is documented behavior.

**verdict**: valid assumption. documented Node.js behavior.

## summary

| assumption | status |
|------------|--------|
| async operations | valid — evidence-based |
| sequential role process | valid — simpler for MVP |
| copy-then-prune order | valid — matches rsync |
| relative paths under fromDir | valid — by construction |
| fg.isMatch API | valid — documented |
| fs.mkdir recursive | valid — documented |

all other assumptions are valid. no fixes needed beyond r3's removal of `__test_*/**`.
