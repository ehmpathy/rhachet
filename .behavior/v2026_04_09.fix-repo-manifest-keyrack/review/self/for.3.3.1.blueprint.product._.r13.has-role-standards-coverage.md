# self-review r13: has-role-standards-coverage

## fresh eyes approach

read the blueprint from scratch. check every line against mechanic standards.

## blueprint line-by-line review

### lines 1-10: summary section

```
create `rhachet repo compile --from src --into dist` command that:
1. discovers roles via same logic as `repo introspect` (getRoleRegistry export)
2. for each role, applies suffix globs to registered dirs (briefs.dirs, skills.dirs, inits.dirs)
3. copies matched files to dist/ with preserved relative structure
4. applies default exclusions and honors `--include`/`--exclude` overrides
```

**check**: no gerunds, lowercase, clear intent.

**verdict**: holds.

### lines 13-33: filediff tree

```
src/
  contract/cli/
    [+] invokeRepoCompile.ts                 # CLI handler
  domain.operations/compile/
    [+] getAllArtifactsForRole.ts            # collect all artifacts for one role
    [+] applyArtifactGlobs.ts                # filter files by artifact globs
    [+] applyExclusions.ts                   # filter out excluded patterns
    [+] copyFileWithStructure.ts             # copy file to dest with structure intact
    [+] pruneEmptyDirs.ts                    # remove empty dirs after copy
```

**check**: correct layer placement per directional-deps.

- invokeRepoCompile in `contract/cli/` — correct (entry point layer)
- domain operations in `domain.operations/compile/` — correct (domain layer)

**check**: no barrel exports (no index.ts).

**verdict**: holds.

### lines 36-59: codepath tree

```
invokeRepoCompile (contract/cli)
  ├─ [←] validate package.json extant (reuse from invokeRepoIntrospect)
  ├─ [←] validate --from dir extant (reuse assertPathWithinRepo pattern)
  ├─ [←] validate --into within repo (reuse assertPathWithinRepo pattern)
  ├─ [←] discover roles via getRoleRegistry (reuse from invokeRepoIntrospect)
  ...
```

**check**: reuse over reinvent. marked with `[←]` for reused patterns.

- `validate package.json extant` — reused from invokeRepoIntrospect
- `assertPathWithinRepo` — reused pattern
- `getRoleRegistry` — reused from invokeRepoIntrospect
- `extractDirUris` — reused from castIntoRoleRegistryManifest
- `getAllFilesFromDir` — reused from infra/filesystem
- `fg.sync` — reused fast-glob pattern

**verdict**: holds. maximizes reuse.

### lines 67-139: getAllArtifactsForRole

**check**: input-context pattern.

line 72-78:
```ts
export const getAllArtifactsForRole = async (
  input: {
    role: Role;
    fromDir: string;
    include?: string[];
    exclude?: string[];
  },
): Promise<string[]> => {
```

uses `input: {...}` object, arrow syntax, explicit return type.

**check**: failfast errors.

line 85-87:
```ts
if (!fs.existsSync(fullPath)) {
  throw new BadRequestError('briefs dir not found', { role: input.role.name, dir });
}
```

throws immediately with context. same pattern for skills (line 96-98) and inits (line 110-112).

**check**: no else branches.

scanned lines 67-139. no `else` keyword found. all conditionals use early throw or early push.

**verdict**: holds.

### lines 142-156: applyArtifactGlobs

**check**: transformer purity.

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

pure function. takes input, returns output. no side effects. no i/o.

**check**: no mutation.

uses `.filter()` and `.some()` — both return new arrays/booleans. input not mutated.

**verdict**: holds.

### lines 159-190: applyExclusions

**check**: precedence logic correct.

```ts
// check custom exclusions first (exclude wins over include)
if (input.exclude?.some((pattern) => fg.isMatch(artifact, pattern))) {
  return false;
}

// check custom inclusions (overrides default exclusions)
if (input.include?.some((pattern) => fg.isMatch(artifact, pattern))) {
  return true;
}

// check default exclusions
if (input.defaultExclusions.some((pattern) => fg.isMatch(artifact, pattern))) {
  return false;
}

return true;
```

order: exclude → include → default → true

this matches criteria 2.2 matrix:
- exclude wins over include
- include overrides default exclusions

**check**: comments explain why.

line 173: `// check custom exclusions first (exclude wins over include)`
line 178: `// check custom inclusions (overrides default exclusions)`

**verdict**: holds.

### lines 193-209: copyFileWithStructure

**check**: idempotent.

```ts
await fs.mkdir(path.dirname(destPath), { recursive: true });
await fs.copyFile(input.source, destPath);
```

`fs.mkdir` with `recursive: true` is idempotent (no-op if extant).
`fs.copyFile` overwrites if extant (idempotent).

**check**: what-why header.

```ts
/**
 * .what = copy file to dest with structure intact
 * .why = maintain directory structure in dist/
 */
```

present and correct.

**verdict**: holds.

### lines 212-231: pruneEmptyDirs

**check**: recursive pattern.

```ts
for (const entry of entries) {
  if (entry.isDirectory()) {
    const subdir = path.join(input.dir, entry.name);
    await pruneEmptyDirs({ dir: subdir });
    const subEntries = await fs.readdir(subdir);
    if (subEntries.length === 0) {
      await fs.rmdir(subdir);
    }
  }
}
```

post-order traversal: recurse first, then check empty. correct for bottom-up cleanup.

**check**: idempotent.

`fs.rmdir` on empty dir is no-op on subsequent calls if dir already removed. each run produces same result.

**verdict**: holds.

### lines 237-269: test coverage

**check**: test types by grain.

| file | grain | test type |
|------|-------|-----------|
| applyArtifactGlobs.test.ts | transformer | unit |
| applyExclusions.test.ts | transformer | unit |
| getAllArtifactsForRole.integration.test.ts | orchestrator | integration |
| copyFileWithStructure.integration.test.ts | communicator | integration |
| pruneEmptyDirs.integration.test.ts | communicator | integration |
| repo.compile.acceptance.test.ts | contract | acceptance |

all correct per `rule.require.test-coverage-by-grain`:
- transformers → unit
- orchestrators → integration
- communicators → integration
- contracts → acceptance + snapshots

**verdict**: holds.

### lines 274-288: acceptance test cases

**check**: positive, negative, edge cases.

positive (lines 276-279):
- happy path: all artifacts copied
- default exclusions applied
- custom --include overrides
- custom --exclude applied

negative (lines 280-286):
- error: absent --from
- error: absent --into
- error: --into outside repo
- error: no package.json
- error: no .agent/
- error: no roles
- error: role dir absent

edge (lines 287-288):
- empty dirs pruned
- dist/ preserved

all 13 test cases have snapshot: yes.

**verdict**: holds.

### lines 291-316: CLI interface + success output

**check**: treestruct format.

```
🐢 cowabunga!

🐚 repo compile
   ├─ from: src
   ├─ into: dist
   └─ compiled 25 artifacts from 2 roles
```

uses:
- `🐢` turtle header
- `🐚` shell root
- `├─` / `└─` branches
- vibe phrase `cowabunga!`

**verdict**: holds.

### lines 320-401: error output examples

**check**: all errors use treestruct + clear message.

7 error cases, each with:
- `🐢 bummer dude...` header
- `🐚 repo compile` root
- `✋ blocked: {reason}` message
- context-specific details (path, role, hint)

example (lines 324-331):
```
🐢 bummer dude...

🐚 repo compile
   └─ ✋ blocked: --from is required

   usage: npx rhachet repo compile --from src --into dist
```

**verdict**: holds.

## gap check

searched for absent patterns:

| pattern | present? |
|---------|----------|
| input-context | yes (all functions) |
| arrow-only | yes (no function keyword) |
| what-why headers | yes (all functions) |
| failfast | yes (BadRequestError throws) |
| failloud | yes (error messages + context) |
| no else | yes (no else keyword) |
| treestruct | yes (output examples) |
| test by grain | yes (correct types) |
| directional-deps | yes (correct layers) |
| idempotent | yes (all operations) |
| lowercase | yes (prose) |
| no gerunds | yes (checked all comments) |

## conclusion

line-by-line verification complete. all mechanic role standards covered:

- input-context pattern on all functions
- arrow-only syntax throughout
- what-why headers on all functions
- failfast with BadRequestError
- failloud with context objects
- no else branches
- treestruct output format
- test coverage by grain
- directional-deps layer structure
- idempotent operations
- lowercase prose
- no gerunds

no gaps found.
